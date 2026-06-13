from fastapi import APIRouter, Depends

from app.api.dependencies import get_project_assignment_service, get_project_service
from app.database.models import User
from app.database.schemas import (
    AssignmentResponse,
    AssignmentSummaryResponse,
    Behavior,
    ProjectRequest,
    ProjectResponse,
    ProjectMemberRequest,
    ProjectMemberResponse,
    ProjectVideoRequest,
    ProjectVideoReport,
    ProjectVideoResponse,
)
from app.services.auth import require_role
from app.services.project_assignment import ProjectAssignmentService
from app.services.project import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])

def _to_assignment_summary(assignment) -> AssignmentSummaryResponse:
    return AssignmentSummaryResponse(
        id=assignment.id,
        project_name=assignment.project_video.project.name,
        user_name=assignment.user.name,
        video_label=assignment.project_video.video.label,
        created_at=assignment.created_at,
        status=assignment.status,
    )

@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(
    payload: ProjectRequest,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Create a new project. Admin access required.

    Returns the created project.
    """
    # Validate behaviors if provided
    behaviors = []
    if payload.behaviors is not None:
        for behavior in payload.behaviors:
            Behavior.model_validate(behavior)
            behaviors.append(behavior.model_dump())

    project = project_service.create_project(payload.name, str(payload.description), behaviors, payload.annotators_per_video)
    return ProjectResponse.model_validate(project)

@router.get("", response_model=list[ProjectResponse], status_code=200)
def list_projects(
    project_service: ProjectService = Depends(get_project_service),
) -> list[ProjectResponse]:
    """
    List projects visible to a user. List all projects if admin, otherwise only projects the user is a member of.

    Returns a list of projects.
    """
    projects = project_service.get_projects()
    return [ProjectResponse.model_validate(p) for p in projects]

@router.get("/{project_id}", response_model=ProjectResponse, status_code=200)
def get_project(
    project_id: str,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Get a specific project by ID. Admin access required.

    Returns the project corresponding to project_id.
    """
    project = project_service.get_project(project_id)
    return ProjectResponse.model_validate(project)

@router.post("/{project_id}", response_model=ProjectResponse, status_code=200)
def update_project(
    project_id: str,
    payload: ProjectRequest,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Update an existing project. Admin access required.

    Returns the updated project.
    """
    # Validate behaviors if provided
    behaviors = []
    if payload.behaviors is not None:
        for behavior in payload.behaviors:
            Behavior.model_validate(behavior)
            behaviors.append(behavior.model_dump())

    project = project_service.update_project(
        project_id,
        project_name=payload.name,
        behaviors=behaviors,
        description=payload.description,
        annotators_per_video=payload.annotators_per_video,
    )
    return ProjectResponse.model_validate(project)

@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: str,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> None:
    """
    Delete a project by ID. Admin access required.
    """
    project_service.delete_project(project_id)

@router.get("/{project_id}/members", response_model=list[ProjectMemberResponse], status_code=200)
def list_project_members(
    project_id: str,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> list[ProjectMemberResponse]:
    """
    List all members of a project. Admin access required.

    Returns a list of project members.
    """
    members = project_service.list_members(project_id)
    return [ProjectMemberResponse.model_validate(m) for m in members]

@router.post("/{project_id}/members", response_model=ProjectResponse, status_code=201)
def add_project_member(
    project_id: str,
    payload: ProjectMemberRequest,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Add a member to a project by user id. Admin access required.

    Returns the updated project.
    """
    updated_project = project_service.add_member(project_id, payload.user_id)
    return ProjectResponse.model_validate(updated_project)

@router.delete("/{project_id}/members", response_model=ProjectResponse, status_code=200)
def remove_project_member(
    project_id: str,
    payload: ProjectMemberRequest,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Remove a member from a project by user id. Admin access required.

    Returns the updated project.
    """
    updated_project = project_service.remove_member(project_id, payload.user_id)
    return ProjectResponse.model_validate(updated_project)

@router.get("/{project_id}/videos", response_model=list[ProjectVideoResponse], status_code=200)
def list_project_videos(
    project_id: str,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> list[ProjectVideoResponse]:
    """
    List all videos linked project. Admin access required.

    Returns a list of project videos.
    """
    videos = project_service.list_linked_videos(project_id)
    return [ProjectVideoResponse.model_validate(v) for v in videos]

@router.post("/{project_id}/videos", response_model=ProjectResponse, status_code=201)
def link_video_to_project(
    project_id: str,
    payload: ProjectVideoRequest,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Link a video to a project. Admin access required.

    Returns the created project-video link.
    """
    updated_project = project_service.link_video(project_id, payload.video_id)
    return ProjectResponse.model_validate(updated_project)

@router.delete("/{project_id}/videos", response_model=ProjectResponse, status_code=200)
def unlink_video_from_project(
    project_id: str,
    payload: ProjectVideoRequest,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Unlink a video from a project. Admin access required.
    """
    updated_project = project_service.unlink_video(project_id, payload.video_id)
    return ProjectResponse.model_validate(updated_project)

@router.get("/{project_id}/videos/detail", response_model=list[ProjectVideoReport], status_code=200)
def get_project_videos_detail(
    project_id: str,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> list[ProjectVideoReport]:
    """
    Get detailed information about all videos linked to a project. Admin access required.

    Returns a list of detailed project video reports.
    """
    videos = project_service.list_linked_videos_detail(project_id)
    return [ProjectVideoReport.model_validate(v) for v in videos]

@router.get("/{project_id}/assignments/me", response_model=list[AssignmentSummaryResponse], status_code=200)
def get_my_project_assignments(
    project_assignment_service: ProjectAssignmentService = Depends(get_project_assignment_service)
) -> list[AssignmentSummaryResponse]:
    """
    Get the current user's assignments for a specific project.

    Returns a list of assignments for the user in the specified project.
    """
    assignments = project_assignment_service.list_my_project_assignments()
    return [AssignmentSummaryResponse.model_validate(_to_assignment_summary(a)) for a in assignments]

@router.get("/{project_id}/assignments", response_model=list[AssignmentSummaryResponse], status_code=200)
def get_all_project_assignments(
    project_id: str,
    _: User = Depends(require_role("admin")),
    project_assignment_service: ProjectAssignmentService = Depends(get_project_assignment_service),
) -> list[AssignmentSummaryResponse]:
    """
    Get all assignments for a specific project. Admin access required.
    
    Returns a list of all assignments for the specified project.
    """
    assignments = project_assignment_service.list_project_assignments()
    return [AssignmentSummaryResponse.model_validate(_to_assignment_summary(a)) for a in assignments]

@router.post("/{project_id}/assignments", response_model=list[AssignmentResponse],status_code=201)
def create_project_assignments(
    project_id: str,
    _: User = Depends(require_role("admin")),
    project_assignment_service: ProjectAssignmentService = Depends(get_project_assignment_service),
) -> list[AssignmentResponse]:
    """
    Create balanced assignments for a project. Admin access required.
    """
    assignments = project_assignment_service.create_project_assignments()
    return [AssignmentResponse.model_validate(a) for a in assignments]

@router.delete("/{project_id}/assignments", status_code=204)
def delete_project_assignments(
    project_id: str,
    _: User = Depends(require_role("admin")),
    project_assignment_service: ProjectAssignmentService = Depends(get_project_assignment_service),
) -> None:
    """
    Reset all assignments for a project by deleting them. Admin access required.
    """
    project_assignment_service.delete_project_assignments()
