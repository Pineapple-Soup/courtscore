from fastAPI import APIRouter, Depends

from app.api.dependencies import get_assignment_service
from app.database.schemas import AssignmentResponse
from app.services.assignment import AssignmentService


router = APIRouter(prefix="/assignments", tags=["assignments"])

@router.get("", response_model=list[AssignmentResponse], status_code=200)
def get_user_assignments(
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> list[AssignmentResponse]:
    assignments = assignment_service.list_user_assignments()
    return [AssignmentResponse.model_validate(a) for a in assignments]