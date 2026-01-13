from fastapi import APIRouter, Depends, File, UploadFile, HTTPException

from app.api.dependencies import get_video_service
from app.database.models import Users
from app.database.schemas import (
    VideoUpdateRequest,
    VideoResponse,
    SignedUrlResponse,
)
from app.services.auth import get_current_user
from app.services.video import VideoService

router = APIRouter(prefix="/videos")


@router.post("/upload", status_code=201, response_model=list[VideoResponse])
def upload_video(
    file: UploadFile = File(...),
    user: Users = Depends(get_current_user),
    video_service: VideoService = Depends(get_video_service),
) -> list[VideoResponse]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    local_file_location = video_service.save_upload_locally(file.file, file.filename)
    created_videos = video_service.upload_video(local_file_location)
    return [VideoResponse.model_validate(v) for v in created_videos]


@router.get("", response_model=list[VideoResponse])
def list_videos(
    video_service: VideoService = Depends(get_video_service),
) -> list[VideoResponse]:
    videos = video_service.list_all()
    return [VideoResponse.model_validate(v) for v in videos]


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(
    video_id: str,
    video_service: VideoService = Depends(get_video_service),
) -> VideoResponse:
    video = video_service.get_by_id(video_id)
    return VideoResponse.model_validate(video)


@router.put("/{video_id}", response_model=VideoResponse)
def update_video(
    video_id: str,
    payload: VideoUpdateRequest,
    user: Users = Depends(get_current_user),
    video_service: VideoService = Depends(get_video_service),
) -> VideoResponse:
    video = video_service.update_status(video_id, payload.status)
    return VideoResponse.model_validate(video)


@router.get("/{video_id}/url", response_model=SignedUrlResponse)
def get_video_url(
    video_id: str,
    video_service: VideoService = Depends(get_video_service),
) -> SignedUrlResponse:
    signed_url = video_service.get_signed_url(video_id)
    return SignedUrlResponse(signed_url=signed_url, expiration=3)
