import heapq

from sqlalchemy.orm import Session, selectinload
from uuid import uuid4

from app.core.context import ServiceContext
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ProcessingError
from app.database.models import Assignment, Project, ProjectVideo


class ProjectAssignmentService:
    def __init__(self, db: Session, ctx: ServiceContext, project_id: str) -> None:
        self.db = db
        self.ctx = ctx
        self.project_id = project_id

    def _get_project(self) -> Project:
        try:
            project = (
                self.db.query(Project)
                .options(
                    selectinload(Project.project_members),
                    selectinload(Project.project_videos),
                    selectinload(Project.project_videos).selectinload(ProjectVideo.assignments),
                )
                .filter(Project.id == self.project_id)
                .first()
            )
        except Exception as e:
            raise NotFoundError(f"Failed to retrieve project: {str(e)}")

        if not project:
            raise NotFoundError("Project not found")

        return project

    def _has_assignments(self) -> bool:
        assignment = (
            self.db.query(Assignment)
            .join(ProjectVideo, Assignment.project_video_id == ProjectVideo.id)
            .filter(ProjectVideo.project_id == self.project_id)
            .first()
        )
        return assignment is not None

    def list_my_project_assignments(self) -> list[Assignment]:
        try:
            assignments = (
                self.db.query(Assignment)
                .join(ProjectVideo, Assignment.project_video_id == ProjectVideo.id)
                .filter(
                    Assignment.user_id == self.ctx.user_id,
                    ProjectVideo.project_id == self.project_id,
                )
                .all()
            )
        except Exception as e:
            raise ProcessingError(f"Failed to retrieve assignments: {str(e)}")

        return assignments

    def list_project_assignments(self) -> list[Assignment]:
        try:
            assignments = (
                self.db.query(Assignment)
                .join(ProjectVideo, Assignment.project_video_id == ProjectVideo.id)
                .filter(ProjectVideo.project_id == self.project_id)
                .options(
                    selectinload(Assignment.user),
                    selectinload(Assignment.project_video)
                    .selectinload(ProjectVideo.video),
                    selectinload(Assignment.project_video)
                    .selectinload(ProjectVideo.project),
                )
                .all()
            )
        except Exception as e:
            raise ProcessingError(f"Failed to retrieve assignments: {str(e)}")

        return assignments

    def create_project_assignments(self) -> list[Assignment]:
        if not self.ctx.is_admin:
            raise ForbiddenError("Admin privileges required to create assignments.")

        if self._has_assignments():
            raise ConflictError(
                "Assignments already exist for this project. Reset or delete existing assignments before creating new ones."
            )

        project = self._get_project()
        project_members = getattr(project, "project_members")
        project_videos = getattr(project, "project_videos")

        k: int = getattr(project, "annotators_per_video")
        if k > len(project_members):
            raise ProcessingError("Number of annotators per video exceeds number of project members.")

        created_assignments: list[Assignment] = []
        pq: list[tuple[int, str]] = []
        for pm in project_members:
            heapq.heappush(pq, (0, getattr(pm, "user_id")))

        for pv in project_videos:
            assigned_users: list[str] = []

            for _ in range(k):
                workload, user_id = heapq.heappop(pq)
                assigned_users.append(user_id)
                heapq.heappush(pq, (workload + 1, user_id))

            for user_id in assigned_users:
                assignment = Assignment(
                    id=str(uuid4()),
                    project_video_id=getattr(pv, "id"),
                    user_id=user_id,
                    status="Not Started",
                )
                created_assignments.append(assignment)
                self.db.add(assignment)

        self.db.commit()
        return created_assignments

    def delete_project_assignments(self) -> None:
        if not self.ctx.is_admin:
            raise ForbiddenError("Admin privileges required to delete assignments.")
        try:
            project_video_ids_subquery = (
                self.db.query(ProjectVideo.id)
                .filter(ProjectVideo.project_id == self.project_id)
            )
            (
                self.db.query(Assignment)
                .filter(Assignment.project_video_id.in_(project_video_ids_subquery))
                .delete(synchronize_session=False)
            )
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise ProcessingError(f"Failed to delete assignments: {str(e)}")