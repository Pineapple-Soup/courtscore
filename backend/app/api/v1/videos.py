import os

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form

from app.api.dependencies import get_video_service
from app.database.models import User
from app.database.schemas import SignedUrlResponse, VideoResponse
from app.services.auth import require_role
from app.services.video import VideoService

router = APIRouter(prefix="/videos")


@router.post("/upload", status_code=201, response_model=list[VideoResponse])
def upload_video(
    file: UploadFile = File(...),
    label: str = Form(...),
    description: str | None = Form(None),
    _: User = Depends(require_role("admin")),
    video_service: VideoService = Depends(get_video_service),
) -> list[VideoResponse]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    local_file_location = video_service.save_upload_locally(file.file, file.filename)

    try:
        created_videos = video_service.upload_video(local_file_location, label=label, description=description)
        return [VideoResponse.model_validate(v) for v in created_videos]
    except Exception as e:
        if os.path.exists(local_file_location):
            os.remove(local_file_location)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=list[VideoResponse])
def list_videos(
    _: User = Depends(require_role("admin")),
    video_service: VideoService = Depends(get_video_service),
) -> list[VideoResponse]:
    videos = video_service.list_all()
    return [VideoResponse.model_validate(v) for v in videos]


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(
    video_id: str,
    _: User = Depends(require_role("admin")),
    video_service: VideoService = Depends(get_video_service),
) -> VideoResponse:
    video = video_service.get(video_id)
    return VideoResponse.model_validate(video)


@router.delete("/{video_id}", status_code=204)
def delete_video(
    video_id: str,
    _: User = Depends(require_role("admin")),
    video_service: VideoService = Depends(get_video_service),
) -> None:
    video_service.delete(video_id)


@router.get("/{video_id}/url", response_model=SignedUrlResponse)
def get_video_url(
    video_id: str,
    video_service: VideoService = Depends(get_video_service),
) -> SignedUrlResponse:
    signed_url = video_service.get_signed_url(video_id)
    return SignedUrlResponse(signed_url=signed_url, expiration=3)
