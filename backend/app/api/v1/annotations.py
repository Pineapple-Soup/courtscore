from fastapi import APIRouter, Depends

from app.api.dependencies import get_annotation_service
from app.database.models import Users
from app.database.schemas import AnnotationRequest, AnnotationResponse
from app.services.annotation import AnnotationService
from app.services.auth import get_current_user

router = APIRouter(prefix="/annotations", tags=["annotations"])


@router.post("/{project_video_id}", response_model=AnnotationResponse, status_code=201)
def create_annotation(
    project_video_id: str,
    payload: AnnotationRequest,
    user: Users = Depends(get_current_user),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    """
    Create a new annotation for a project video.

    User must be assigned to the video.
    """
    annotation = annotation_service.create(project_video_id, str(user.id), payload.segments)
    return AnnotationResponse.model_validate(annotation)


@router.get("/{project_video_id}", response_model=AnnotationResponse)
def get_annotation(
    project_video_id: str,
    user: Users = Depends(get_current_user),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    """
    Get annotation for a project video.

    Returns the current user's annotation. Creates empty annotation if none exists.
    User must be assigned to the video.
    """
    annotation = annotation_service.get_or_create(project_video_id, str(user.id))
    return AnnotationResponse.model_validate(annotation)


@router.put("/{project_video_id}", response_model=AnnotationResponse)
def update_annotation(
    project_video_id: str,
    payload: AnnotationRequest,
    user: Users = Depends(get_current_user),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:

    annotation = annotation_service.update(
        project_video_id, str(user.id), payload.segments
    )
    return AnnotationResponse.model_validate(annotation)


@router.post("/{project_video_id}/submit", response_model=AnnotationResponse)
def submit_annotation(
    project_video_id: str,
    user: Users = Depends(get_current_user),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    """
    Submit and lock an annotation.

    Once submitted, the annotation cannot be modified. This action cannot be undone.
    User must be assigned to the video.
    """
    annotation = annotation_service.submit(project_video_id, str(user.id))
    return AnnotationResponse.model_validate(annotation)
