from fastapi import APIRouter, Depends

from app.api.dependencies import get_assignment_service, get_project_service
from app.database.models import User
from app.database.schemas import AssignmentResponse, ProjectRequest, ProjectResponse, ProjectMemberResponse, ProjectVideoResponse
from app.services.auth import require_role
from app.services.assignment import AssignmentService
from app.services.project import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])

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
    project = project_service.create_project(payload.name, str(payload.description), payload.annotators_per_video)
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
    _: User = Depends(require_role("user")),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Get a specific project by ID. User access required.

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
    project = project_service.update_project(
        project_id,
        project_name=payload.name,
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

@router.post("/{project_id}/members", response_model=ProjectResponse, status_code=200)
def add_project_member(
    project_id: str,
    member_email: str,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Add a member to a project by email. Admin access required.

    Returns the updated project.
    """
    project = project_service.add_member(project_id, member_email)
    return ProjectResponse.model_validate(project)

@router.delete("/{project_id}/members", response_model=ProjectResponse, status_code=200)
def remove_project_member(
    project_id: str,
    member_id: str,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Remove a member from a project by member ID. Admin access required.

    Returns the updated project.
    """
    project = project_service.remove_member(project_id, member_id)
    return ProjectResponse.model_validate(project)

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

@router.post("/{project_id}/videos", response_model=ProjectVideoResponse, status_code=201)
def link_video_to_project(
    project_id: str,
    video_id: str,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectVideoResponse:
    """
    Link a video to a project. Admin access required.

    Returns the created project-video link.
    """
    project_video = project_service.link_video(project_id, video_id)
    return ProjectVideoResponse.model_validate(project_video)

@router.delete("/{project_id}/videos", status_code=204)
def unlink_video_from_project(
    project_id: str,
    project_video_id: str,
    _: User = Depends(require_role("admin")),
    project_service: ProjectService = Depends(get_project_service),
) -> None:
    """
    Unlink a video from a project. Admin access required.
    """
    project_service.unlink_video(project_id, project_video_id)

@router.get("/{project_id}/assignments", response_model=list[AssignmentResponse], status_code=200)
def get_user_assignments(
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> list[AssignmentResponse]:
    assignments = assignment_service.list_user_assignments_in_project()
    return [AssignmentResponse.model_validate(a) for a in assignments]

@router.post("/{project_id}/assignments", response_model=list[AssignmentResponse],status_code=201)
def create_assignments(
    _: User = Depends(require_role("admin")),
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> list[AssignmentResponse]:
    assignments = assignment_service.create_balanced_assignments()
    return [AssignmentResponse.model_validate(a) for a in assignments]