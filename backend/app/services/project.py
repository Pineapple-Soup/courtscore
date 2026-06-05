from sqlalchemy.dialects.postgresql import Any
from collections import defaultdict
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session, selectinload
from typing import Dict, Optional, cast
from uuid import uuid4

from app.core.context import ServiceContext
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.database.models import (
    Annotation,
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
        project = (
            self.db.query(Project)
            .options(
                selectinload(Project.project_members),
                selectinload(Project.project_videos).options(
                    joinedload(ProjectVideo.video),
                    selectinload(ProjectVideo.assignments).options(
                        joinedload(Assignment.annotation),
                        joinedload(Assignment.user),
                    ),
                ),
            )
            .filter(Project.id == project_id)
            .first()
        )
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
        return (
            self.db.query(ProjectVideo)
            .options(
                selectinload(ProjectVideo.video),
                selectinload(ProjectVideo.assignments),
            )
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

    def _has_assignments(self, project_id: str) -> bool:
        assignment = (
            self.db.query(Assignment)
            .join(ProjectVideo, Assignment.project_video_id == ProjectVideo.id)
            .filter(ProjectVideo.project_id == project_id)
            .first()
        )
        return assignment is not None

    def _ensure_resources_unlocked(self, project_id: str, operation: str) -> None:
        if self._has_assignments(project_id):
            raise ConflictError(
                f"Cannot {operation} after assignments have been created for this project. Reset or delete assignments first."
            )

    # ==================== Project Management ====================

    def create_project(self, project_name: str, description: str, behaviors: list[dict[str, str]], annotators_per_video: int) -> Project:
        """
        Create a new project.

        Args:
            project_name: Name of the project
            description: Description of the project
            behaviors: List of behaviors for the project
            annotators_per_video: Number of annotators per video

        Returns:
            Created Project
        """
        self._require_admin()

        project = Project(
            id=str(uuid4()),
            name=project_name,
            description=description,
            behaviors=behaviors,
            annotators_per_video=annotators_per_video,
        )
        
        self.db.add(project)
        self.db.commit()
        return self._get_project(str(project.id))

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

    def get_project(self, project_id: str) -> Project:
        """
        Get a specific project by ID.

        Raises:
            ForbiddenError: If user is not a member or admin
            NotFoundError: If project doesn't exist
        """
        project = self._get_project(project_id)

        if not self.ctx.is_admin:
            self._require_member(project_id)

        return project

    def update_project(
        self, 
        project_id: str, 
        project_name: Optional[str] = None, 
        description: Optional[str] = None, 
        behaviors: Optional[list[dict[str,str]]] = None, 
        annotators_per_video: Optional[int] = None
    ) -> Project:
        """
        Update project details.
        """
        self._require_admin()

        project = self._get_project(project_id)
        self._ensure_resources_unlocked(project_id, "change annotators per video")

        if project_name is not None:
            setattr(project, "name", project_name)
        if description is not None:
            setattr(project, "description", description)
        if behaviors is not None:
            setattr(project, "behaviors", behaviors)
        if annotators_per_video is not None:
            setattr(project, "annotators_per_video", annotators_per_video)

        self.db.commit()
        return self._get_project(project_id)

    def delete_project(self, project_id: str) -> None:
        """
        Delete a project and all related data. Cascades to members, project videos, assignments, and annotations.
        """
        project = self._get_project(project_id)

        self.db.delete(project)
        self.db.commit()

    # ==================== Member Management ====================

    def add_member(self, project_id: str, user_id: str) -> Project:
        """
        Add a user to a project.

        Args:
            project_id: Project to add member to
            user_id: ID of the user to add

        Returns:
            User record

        Raises:
            ForbiddenError: If requester is not admin
            NotFoundError: If user with email doesn't exist
            ConflictError: If user is already a member of the project
        """
        self._require_admin()
        self._ensure_resources_unlocked(project_id, "add project members")

        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User with that ID not found")

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

        project_member = ProjectMember(id=str(uuid4()), project_id=project_id, user_id=user.id)
        self.db.add(project_member)
        self.db.commit()
        return self._get_project(project_id)

    def list_members(self, project_id: str) -> list[ProjectMember]:
        """
        List all members of a project.

        Raises:
            ForbiddenError: If requester is not a project member
        """
        self._require_admin()

        project: Project = self._get_project(project_id)
        return cast(list[ProjectMember], project.project_members)

    def remove_member(self, project_id: str, user_id: str) -> Project:
        """
        Remove a member from a project. Preserves submitted annotations for research record.

        Args:
            project_id: Project to remove member from
            user_id: ID of the user to remove

        Raises:
            ForbiddenError: If requester is not an admin
            NotFoundError: If user is not a member
        """
        self._require_admin()
        self._ensure_resources_unlocked(project_id, "remove project members")

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
        return self._get_project(project_id)

    # ==================== Video Management ====================

    def link_video(self, project_id: str, video_id: str) -> Project:
        """
        Link a video from the library to a project.

        Args:
            project_id: Project to link video to
            video_id: Video to link

        Returns:
            Updated project record

        Raises:
            ForbiddenError: If requester is not owner
            NotFoundError: If video doesn't exist
            ConflictError: If video is already linked
            BadRequestError: If not enough members for assignment
        """
        self._require_admin()
        self._ensure_resources_unlocked(project_id, "link project videos")

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
        return self._get_project(project_id)

    def list_linked_videos(self, project_id: str) -> list[ProjectVideo]:
        """
        List all videos linked to a project.
        """
        self._require_admin()
        project = self._get_project(project_id)
        return cast(list[ProjectVideo], project.project_videos)

    def list_linked_videos_detail(self, project_id: str) -> list[Dict[str, str | list]]:
        self._require_admin()
        project = self._get_project(project_id)
        behavior_map = {behavior.get("name"): behavior for behavior in project.behaviors or []}

        detailed_video_list = []
        for project_video in project.project_videos:
            detailed_video = {
                "video_id": project_video.video.id,
                "video_label": project_video.video.label,
                "assignments": [],
                "flags": [],
            }

            behavior_segment_counts: dict[str, list[int]] = defaultdict(list)
            for assignment in project_video.assignments:
                annotation: Annotation = assignment.annotation
                segment_counts: Dict[str, int] = defaultdict(int)
                if annotation and annotation.segments:
                    for segment in annotation.segments:
                        behavior_name = segment.get("behavior", {}).get("name")
                        if behavior_name:
                            segment_counts[behavior_name] += 1
                
                for behavior in project.behaviors or []:
                    behavior_name = behavior.get("name")
                    behavior_segment_counts[behavior_name].append(segment_counts[behavior_name])

                detailed_video["assignments"].append(
                    {
                        "assignment_id": assignment.id,
                        "user_id": assignment.user.id,
                        "user_name": assignment.user.name,
                        "status": assignment.status,
                        "updated_at": annotation.updated_at if annotation else None,
                        "segment_counts": dict(segment_counts),
                    }
                )

            for name, counts in behavior_segment_counts.items():
                behavior = behavior_map.get(name)
                threshold = behavior.get("threshold") if behavior else None
                if behavior and threshold is not None and len(counts) > 1:
                    count_diff = max(counts) - min(counts)
                    if count_diff > threshold:
                        detailed_video["flags"].append(
                            {
                                "behavior_name": name,
                                "threshold": threshold,
                                "counts": counts,
                                "difference": count_diff,
                            }
                        )
            
            detailed_video_list.append(detailed_video)

        return detailed_video_list

    def unlink_video(self, project_id: str, video_id: str) -> Project:
        """
        Remove a video from a project. Cascades to delete assignments and annotations.

        Args:
            project_id: Project to remove video from
            video_id: ID of the video to remove

        Returns:
            Updated project record

        Raises:
            ForbiddenError: If requester is not an admin
            NotFoundError: If project video doesn't exist
        """
        self._require_admin()
        self._ensure_resources_unlocked(project_id, "unlink project videos")

        project_video = (self.db
            .query(ProjectVideo)
            .filter(
                ProjectVideo.video_id == video_id,
                ProjectVideo.project_id == project_id,
            )
            .first()
        )

        if not project_video:
            raise NotFoundError("Video not found in project")

        self.db.delete(project_video)
        self.db.commit()
        return self._get_project(project_id)
