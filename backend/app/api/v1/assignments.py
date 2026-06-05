from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_assignment_service
from app.database.schemas import UpdateAssignmentRequest, AssignmentResponse, AssignmentSummaryResponse
from app.services.assignment import AssignmentService

router = APIRouter(prefix="/assignments", tags=["assignments"])

def _to_assignment_summary(assignment) -> AssignmentSummaryResponse:
    return AssignmentSummaryResponse(
        id=assignment.id,
        project_name=assignment.project_video.project.name,
        user_name=assignment.user.name,
        video_label=assignment.project_video.video.label,
        created_at=assignment.created_at,
        status=assignment.status,
    )


@router.get("", response_model=list[AssignmentSummaryResponse], status_code=200)
def get_user_assignments(
    project_id: str | None = None,
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> list[AssignmentSummaryResponse]:
    if project_id:
        assignments = assignment_service.list_user_assignments_in_project(project_id)
    else:
        assignments = assignment_service.list_user_assignments()
    return [AssignmentSummaryResponse.model_validate(_to_assignment_summary(a)) for a in assignments]

@router.get("/{assignment_id}", response_model=AssignmentResponse, status_code=200)
def get_assignment(
    assignment_id: str,
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> AssignmentResponse:
    assignment = assignment_service.get_assignment(assignment_id)
    return AssignmentResponse.model_validate(assignment)

@router.put("/{assignment_id}", response_model=AssignmentResponse, status_code=200)
def update_assignment_status(
    assignment_id: str,
    payload: UpdateAssignmentRequest,
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> AssignmentResponse:
    assignment = assignment_service.update_assignment_status(assignment_id, payload.status)
    return AssignmentResponse.model_validate(assignment)

@router.get("/{assignment_id}/context", status_code=200)
def get_assignment_context(
    assignment_id: str,
    assignment_service: AssignmentService = Depends(get_assignment_service),
):
    return assignment_service.get_assignment_context(assignment_id)

@router.get("/{assignment_id}/export", status_code=200)
def export_assignment(
    assignment_id: str,
    assignment_service: AssignmentService = Depends(get_assignment_service),
):
    stream, filename = assignment_service.export_assignment(assignment_id)
    return StreamingResponse(
        stream,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )