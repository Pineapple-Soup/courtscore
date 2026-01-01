import os
import secrets
import shutil
import urllib.parse
import uuid
import uvicorn

from app.core.config import settings
from app.database.db import init_db, get_db
from app.database.models import Video, Annotations, Users
from app.services import auth, gcs, preprocess
from fastapi import Body, Depends, FastAPI, File, UploadFile, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from sqlalchemy.orm import Session

app = FastAPI()
init_db()

# Dev CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(settings.OUTPUT_PATH, exist_ok=True)

@app.post("/api/v1/upload_video", status_code=201)
def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        # Ensure filename is a non-None string and sanitize it to avoid path issues
        if not file.filename:
            raise FileNotFoundError
        safe_filename = os.path.basename(file.filename)
        file_location = os.path.join(settings.UPLOAD_DIRECTORY, safe_filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        model_path = settings.YOLO_MODEL_PATH
        if not model_path:
            raise HTTPException(status_code=500, detail="YOLO_MODEL_PATH environment variable not set")
        processed_files = preprocess.process_video(file_location, settings.OUTPUT_PATH, model_path)
        for processed_file in processed_files:
            video_id, gcp_path = gcs.upload_video_to_gcs(processed_file)
            new_video = Video(id=video_id, src=gcp_path, label=os.path.splitext(os.path.basename(processed_file))[0])
            print("Created Video")
            db.add(new_video)
            db.commit()
            db.refresh(new_video)

        # Cleanup files
        for processed_file in processed_files:
            os.remove(processed_file)
        os.remove(file_location)

        return
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/v1/videos")
def list_videos(db: Session = Depends(get_db)):
    try:
        db_videos = db.query(Video).all()
        return db_videos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch videos: {str(e)}")

@app.put("/api/v1/videos/{id}")
def update_video(id: str, video: dict = Body(...), db: Session = Depends(get_db)):
    existing_video = db.query(Video).filter(Video.id == id).first()
    if not existing_video:
        raise HTTPException(status_code=404, detail="Video not found")
    try:
        existing_video.status = video['status']
        db.commit()
        db.refresh(existing_video)
        return {"success": True, "video": existing_video}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/videos/{id}")
def get_video(id: str, db: Session = Depends(get_db)):
    try:
        video = db.query(Video).filter(Video.id == id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        return video
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch video: {str(e)}")

@app.get("/api/v1/videos/{id}/url")
def stream_video(id: str, db: Session = Depends(get_db)):
    try:
        video = db.query(Video).filter(Video.id == id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        signed_url = gcs.generate_signed_url(video.src)
        return {"signed_url": signed_url, "expiration": 3}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch video stream: {str(e)}")

@app.post("/api/v1/annotations/")
def create_annotation(annotation: dict = Body(...), db: Session = Depends(get_db)):
    try:
        new_annotation = Annotations(id=str(uuid.uuid4()), video_id=annotation['video_id'], segments=annotation["segments"])
        db.add(new_annotation)
        db.commit()
        db.refresh(new_annotation)
        return {"success": True, "annotation": new_annotation}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@app.put("/api/v1/annotations/{id}")
def update_annotation(id: str, annotation: dict = Body(...), db: Session = Depends(get_db)):
    existing_annotation = db.query(Annotations).filter(Annotations.video_id == id).first()
    if not existing_annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    try:
        existing_annotation.segments = annotation['segments']
        db.commit()
        db.refresh(existing_annotation)
        return {"success": True, "annotation": existing_annotation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/v1/annotations/{id}")
def get_annotation(id: str, db: Session = Depends(get_db)):
    annotation = db.query(Annotations).filter(Annotations.video_id == id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return annotation

@app.get("/auth/google/login")
def auth_google_login():
    base = "https://accounts.google.com/o/oauth2/v2/auth"
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.AUTH_GOOGLE_ID,
        "redirect_uri": settings.AUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }

    url = f"{base}?{urllib.parse.urlencode(params)}"

    response = RedirectResponse(url)
    response.set_cookie(
        "oauth_state",
        state,
        httponly=True,
        secure=False # True in production
    )

    return response

@app.get("/auth/google/callback")
async def auth_google_callback(request: Request, response: Response, code: str | None = None, state: str | None = None) -> RedirectResponse:
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    
    stored_state = request.cookies.get("oauth_state")
    if not stored_state or stored_state != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    
    # Exchange code for tokens
    token_response = await auth.exchange_code_for_tokens(code)
    id_token_str = token_response.get("id_token")
    if not id_token_str:
        raise HTTPException(status_code=400, detail="No id_token returned from provider")

    # Verify id_token locally
    try:
        id_info = google_id_token.verify_oauth2_token(id_token_str, google_requests.Request(), settings.AUTH_GOOGLE_ID)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid id_token: {e}")
    
    user = auth.user_from_google(id_info)
    jwt = auth.create_access_token(str(user.id))

    # Set cookie
    response = RedirectResponse(settings.FRONTEND_URL + "/dashboard")
    response.set_cookie("access_token", jwt, httponly=True)
    response.delete_cookie("oauth_state")
    return response

@app.get("/auth/me")
def auth_me(user: Users = Depends(auth.get_current_user)) -> dict[str, str]:
    return {"id": str(user.id), "email": str(user.email), "name": str(user.name), "role": str(user.role)}

@app.post("/auth/logout")
def auth_logout(response: Response):
    response.delete_cookie("access_token")
    return {"success": True}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
