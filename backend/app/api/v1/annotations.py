from fastapi import APIRouter, Depends

from app.api.dependencies import get_annotation_service
from app.database.models import Users
from app.database.schemas import (
    AnnotationCreateRequest,
    AnnotationUpdateRequest,
    AnnotationResponse,
)
from app.services.annotation import AnnotationService
from app.services.auth import get_current_user

router = APIRouter(prefix="/annotations")


@router.post("", response_model=AnnotationResponse)
def create_annotation(
    payload: AnnotationCreateRequest,
    user: Users = Depends(get_current_user),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    annotation = annotation_service.create(
        video_id=payload.video_id,
        user_id=str(user.id),
        segments=payload.segments
    )
    return AnnotationResponse.model_validate(annotation)


@router.get("/{video_id}", response_model=AnnotationResponse)
def get_annotation(
    video_id: str,
    user: Users = Depends(get_current_user),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    annotation = annotation_service.get_by_video_id(video_id)
    return AnnotationResponse.model_validate(annotation)


@router.put("/{video_id}", response_model=AnnotationResponse)
def update_annotation(
    video_id: str,
    payload: AnnotationUpdateRequest,
    user: Users = Depends(get_current_user),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    annotation = annotation_service.update(
        video_id=video_id,
        segments=payload.segments
    )
    return AnnotationResponse.model_validate(annotation)
