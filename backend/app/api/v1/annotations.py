from fastapi import APIRouter, Depends

from app.api.dependencies import get_annotation_service
from app.database.schemas import AnnotationRequest, AnnotationResponse
from app.services.annotation import AnnotationService

router = APIRouter(prefix="/annotations", tags=["annotations"])


@router.post("/{assignment_id}", response_model=AnnotationResponse, status_code=201)
def create_annotation(
    assignment_id: str,
    payload: AnnotationRequest,
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    """
    Create a new annotation for an assignment. Assignment must be for the current user.

    Returns the created annotation.
    """
    annotation = annotation_service.create(assignment_id, payload.segments)
    return AnnotationResponse.model_validate(annotation)


@router.get("/{assignment_id}", response_model=AnnotationResponse)
def get_annotation(
    assignment_id: str,
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    """
    Get annotation for an assignmnet. Assignment must be for the current user.

    Returns the annotation corresponding to assignment_id.
    """
    annotation = annotation_service.get(assignment_id) 
    return AnnotationResponse.model_validate(annotation)


@router.put("/{assignment_id}", response_model=AnnotationResponse)
def update_annotation(
    assignment_id: str,
    payload: AnnotationRequest,
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    """
    Update an existing annotation for an assignment. Assignment must be for the current user.
    
    Returns the updated annotation.
    """

    annotation = annotation_service.update(assignment_id, payload.segments)
    return AnnotationResponse.model_validate(annotation)


@router.post("/{assignment_id}/submit", response_model=AnnotationResponse)
def submit_annotation(
    assignment_id: str,
    annotation_service: AnnotationService = Depends(get_annotation_service),
) -> AnnotationResponse:
    """
    Submit and lock an annotation. Assignment must be for the current user.

    Once submitted, the annotation cannot be modified. This action cannot be undone.
    Returns the submitted annotation.
    """
    annotation = annotation_service.submit(assignment_id)
    return AnnotationResponse.model_validate(annotation)
