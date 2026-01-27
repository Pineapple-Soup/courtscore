from sqlalchemy.orm import Session
from typing import Optional
from uuid import uuid4

from app.core.context import ServiceContext
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.database.models import (
    Assignment,
    Project,
    ProjectMember,
    ProjectVideo,
    Video,
    User,
)


class ProjectService:
    def __init__(self, db: Session, ctx: ServiceContext):
        self.db = db
        self.ctx = ctx
    
    def _get_project(self, project_id: str) -> Project:
        """
        Get a project by ID.

        Raises:
            NotFoundError: If project doesn't exist
        """
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise NotFoundError("Project not found")
        return project

    def _list_projects(self) -> list[Project]:
        """
        List all projects in the system.
        """
        return self.db.query(Project).all()
    
    def _list_project_videos(self, project_id: str) -> list[ProjectVideo]:
        """
        List all videos linked to a project.
        """
        return (self.db
            .query(ProjectVideo)
            .filter(ProjectVideo.project_id == project_id)
            .all()
        )

    def _require_admin(self) -> None:
        """Verify user is an admin."""

        if not self.ctx.is_admin:
            raise ForbiddenError("Admin privileges required to access this resource")

    def _require_member(self, project_id: str) -> None:
        """Verify user is a member of the project."""
        member = (self.db
            .query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == self.ctx.user_id,
            )
            .first()
        )

        if not member:
            raise ForbiddenError("Must be a project member to access this resource")

    # ==================== Project Management ====================

    def create_project(self, project_name: str, description: str, annotators_per_video: int) -> Project:
        """
        Create a new project.

        Args:
            project_name: Name of the project
            description: Description of the project
            annotators_per_video: Number of annotators per video

        Returns:
            Created Project
        """
        self._require_admin()

        project = Project(
            id=str(uuid4()),
            name=project_name,
            description=description,
            annotators_per_video=annotators_per_video,
        )
        
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project

    def get_projects(self) -> list[Project]:
        """
        List projects visible to a user.

        Args:
            user_id: Current user

        Returns:
            List of all projects if the user is an admin
            List of projects where the user is a member
        """
        if self.ctx.is_admin:
            return self._list_projects()
        
        return (self.db
            .query(Project)
            .join(ProjectMember, Project.id == ProjectMember.project_id)
            .filter(ProjectMember.user_id == self.ctx.user_id)
            .all()
        )

    def update_project(self, project_id: str, project_name: Optional[str] = None, description: Optional[str] = None, annotators_per_video: Optional[int] = None) -> Project:
        """
        Update project details.
        """
        self._require_admin()

        project = self._get_project(project_id)

        if project_name is not None:
            setattr(project, "name", project_name)
        if description is not None:
            setattr(project, "description", description)
        if annotators_per_video is not None:
            setattr(project, "annotators_per_video", annotators_per_video)

        self.db.commit()
        self.db.refresh(project)
        return project

    def delete_project(self, project_id: str) -> None:
        """
        Delete a project and all related data. Cascades to members, project videos, assignments, and annotations.
        """
        project = self._get_project(project_id)

        self.db.delete(project)
        self.db.commit()

    # ==================== Member Management ====================

    def add_member(self, project_id: str, email: str) -> ProjectMember:
        """
        Add a user to a project.

        Args:
            project_id: Project to add member to

        Returns:
            ProjectMember record

        Raises:
            ForbiddenError: If requester is not admin
            NotFoundError: If user with email doesn't exist
            ConflictError: If user is already a member of the project
        """
        self._require_admin()

        # Look up user by email
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            raise NotFoundError("User with that email not found")

        # Check if already a member
        existing = (self.db
            .query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user.id
            )
            .first()
        )
        if existing:
            raise ConflictError("User is already a member of this project")

        member = ProjectMember(id=str(uuid4()), project_id=project_id, user_id=user.id)
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return ProjectMember

    def list_members(self, project_id: str) -> list[ProjectMember]:
        """
        List all members of a project.

        Raises:
            ForbiddenError: If requester is not a project member
        """
        self._require_admin()

        members = (
            self.db
            .query(ProjectMember, User)
            .join(User, ProjectMember.user_id == User.id)
            .filter(ProjectMember.project_id == project_id)
            .all()
        )

        return members

    def remove_member(self, project_id: str, user_id: str) -> None:
        """
        Remove a member from a project.

        Preserves submitted annotations for research record.

        Raises:
            ForbiddenError: If requester is not an admin
            NotFoundError: If user is not a member
        """
        self._require_admin()

        member = (self.db
            .query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id,
            )
            .first()
        )

        if not member:
            raise NotFoundError("User is not a member of this project")

        # Remove membership
        self.db.delete(member)
        self.db.commit()

    # ==================== Video Management ====================

    def link_video(self, project_id: str, video_id: str) -> ProjectVideo:
        """
        Link a video from the library to a project.

        Raises:
            ForbiddenError: If requester is not owner
            NotFoundError: If video doesn't exist
            ConflictError: If video is already linked
            BadRequestError: If not enough members for assignment
        """
        self._require_admin()

        # Verify video exists
        video = self.db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise NotFoundError("Video not found in library")

        # Check if already linked
        existing = (self.db
            .query(ProjectVideo)
            .filter(
                ProjectVideo.project_id == project_id,
                ProjectVideo.video_id == video_id,
            )
            .first()
        )
        if existing:
            raise ConflictError("Video is already linked to this project")

        # Create project video
        project_video = ProjectVideo(id=str(uuid4()), project_id=project_id, video_id=video_id)

        self.db.add(project_video)
        self.db.commit()
        self.db.refresh(project_video)

        return project_video

    def _list_linked_videos(self, project_id: str) -> list[ProjectVideo]:
        """
        List all videos linked to a project.
        """
        return (self.db
            .query(ProjectVideo)
            .filter(ProjectVideo.project_id == project_id)
            .all()
        )
    
    def get_linked_videos(self, project_id: str) -> list[ProjectVideo]:
        """
        List all videos linked to a project assigned to a user.
        """

        if self.ctx.is_admin:
            return self._list_linked_videos(project_id)
        
        self._require_member(project_id)

        # select only videos assigned to the user and within the current project
        user_assignment = (self.db
            .query(ProjectVideo)
            .join(ProjectVideo, Assignment.project_video_id == ProjectVideo.id)
            .filter(
                Assignment.user_id == self.ctx.user_id,
                ProjectVideo.project_id == project_id,
            )
            .all()
        )

        return user_assignment

    def unlink_video(self, project_id: str, project_video_id: str) -> None:
        """
        Remove a video from a project.

        Cascades to delete assignments and annotations.

        Raises:
            ForbiddenError: If requester is not an admin
            NotFoundError: If project video doesn't exist
        """
        self._require_admin()

        pv = (self.db
            .query(ProjectVideo)
            .filter(
                ProjectVideo.id == project_video_id,
                ProjectVideo.project_id == project_id,
            )
            .first()
        )

        if not pv:
            raise NotFoundError("Video not found in project")

        self.db.delete(pv)
        self.db.commit()
