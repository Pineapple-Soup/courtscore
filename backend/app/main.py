import shutil
import os
import uvicorn

from core.config import settings
from database.db import init_db, get_db
from database.models import Video
from fastapi import Depends, FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services import gcs, preprocess
from sqlalchemy.orm import Session

app = FastAPI()
init_db()

# Dev CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(settings.OUTPUT_PATH, exist_ok=True)

@app.post("/api/v1/upload_video", status_code=201)
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        file_location = os.path.join(settings.UPLOAD_DIRECTORY, file.filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        model_path = settings.YOLO_MODEL_PATH
        if not model_path:
            raise HTTPException(status_code=500, detail="YOLO_MODEL_PATH environment variable not set")
        processed_files = preprocess.process_video(file_location, settings.OUTPUT_PATH, model_path)
        for processed_file in processed_files:
            video_id, gcp_path = gcs.upload_video_to_gcs(processed_file)
            new_video = Video(id=video_id, src=gcp_path, label=os.path.basename(processed_file))
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
async def list_videos(db: Session = Depends(get_db)):
    try:
        db_videos = db.query(Video).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch videos: {str(e)}")
    videos = [
        {
            "id": video.id,
            "src": video.src,
            "label": video.label,
            "status": video.status,
        }
        for video in db_videos
    ]
    return videos


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
