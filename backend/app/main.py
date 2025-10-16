import shutil
import os
import uvicorn

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Dev CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIRECTORY = "tmp"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

@app.post("/api/v1/upload_video", status_code=201)
async def upload_file(file: UploadFile = File(...)):
    try:
        file_location = os.path.join(UPLOAD_DIRECTORY, file.filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # TODO: Process video after upload

        return {
            "filename": file.filename,
            "message": "Upload successful",
            "path": file_location
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Upload failed: {str(e)}"
        )


@app.get("/api/v1/videos")
async def list_videos():
    videos = []
    for file in os.listdir(UPLOAD_DIRECTORY):
        if file.endswith((".mp4", ".mov", ".avi", ".mts")):
            videos.append({
                "id": file,
                "src": f"/videos/{file}"
            })
    return videos


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
