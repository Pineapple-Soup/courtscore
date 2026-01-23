from fastapi import APIRouter, Depends

from app.api.dependencies import get_annotation_service
from app.database.models import User
from app.database.schemas import AnnotationRequest, AnnotationResponse
from app.services.annotation import AnnotationService
from app.services.auth import get_current_user

router = APIRouter(prefix="/annotations", tags=["annotations"])


@router.post("/{assignment_id}", response_model=AnnotationResponse, status_code=201)
def create_annotation(
    assignment_id: str,
    payload: AnnotationRequest,
    user: User = Depends(get_current_user),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    """
    Create a new annotation for an assignment. Assignment must be for the current user.

    Returns the created annotation.
    """
    annotation = annotation_service.create(assignment_id, str(user.id), payload.segments)
    return AnnotationResponse.model_validate(annotation)


@router.get("/{assignment_id}", response_model=AnnotationResponse)
def get_annotation(
    assignment_id: str,
    user: User = Depends(get_current_user),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    """
    Get annotation for an assignmnet. Assignment must be for the current user.

    Returns the annotation corresponding to assignment_id.
    """
    annotation = annotation_service.get(assignment_id, str(user.id))
    return AnnotationResponse.model_validate(annotation)


@router.put("/{assignment_id}", response_model=AnnotationResponse)
def update_annotation(
    assignment_id: str,
    payload: AnnotationRequest,
    user: User = Depends(get_current_user),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    """
    Update an existing annotation for an assignment. Assignment must be for the current user.
    
    Returns the updated annotation.
    """

    annotation = annotation_service.update(assignment_id, str(user.id), payload.segments)
    return AnnotationResponse.model_validate(annotation)


@router.post("/{assignment_id}/submit", response_model=AnnotationResponse)
def submit_annotation(
    assignment_id: str,
    user: User = Depends(get_current_user),
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    """
    Submit and lock an annotation. Assignment must be for the current user.

    Once submitted, the annotation cannot be modified. This action cannot be undone.
    Returns the submitted annotation.
    """
    annotation = annotation_service.submit(assignment_id, str(user.id))
    return AnnotationResponse.model_validate(annotation)
