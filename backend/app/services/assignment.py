import heapq

from sqlalchemy.orm import Session
from typing import Optional
from uuid import uuid4

from app.core.context import ServiceContext
from app.core.exceptions import ForbiddenError, NotFoundError, ProcessingError
from app.database.models import Assignment, Project, ProjectMember, ProjectVideo

class AssignmentService:
    def __init__(self, db: Session, ctx: ServiceContext, project_id: Optional[str]) -> None:
        self.db = db
        self.ctx = ctx
        self.project_id = project_id

    def _get_project(self) -> Project:
        try:
            project = self.db.query(Project).filter(Project.id == self.project_id).first()
        except Exception as e:
            raise NotFoundError(f"Failed to retrieve project: {str(e)}")

        return project
    
    def _get_project_members(self) -> list[ProjectMember]:
        return (self.db
            .query(ProjectMember)
            .filter(ProjectMember.project_id == self.project_id)
            .all()
        )
    
    def _get_project_videos(self) -> list[ProjectVideo]:
        return (self.db
            .query(ProjectVideo)
            .filter(ProjectVideo.project_id == self.project_id)
            .all()
        )
    
    def create_balanced_assignments(self) -> None:
        if not self.ctx.is_admin:
            raise ForbiddenError("Admin privileges required to create assignments.")

        project = self._get_project()
        project_members = self._get_project_members()
        project_videos = self._get_project_videos()

        k: int = getattr(project, "annotators_per_video")
        if k > len(project_members):
            raise ProcessingError("Number of annotators per video exceeds number of project members.")

        pq = []
        for pm in project_members:
            heapq.heappush(pq, (0, getattr(pm, "user_id")))

        for pv in project_videos:
            assigned_users = []

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
                self.db.add(assignment)
        self.db.commit()

    def list_user_assignments(self) -> list[Assignment]:
        try:
            assignments = (self.db
                .query(Assignment)
                .filter(Assignment.user_id == self.ctx.user_id)
                .all()
            )
        except Exception as e:
            raise ProcessingError(f"Failed to retrieve assignments: {str(e)}")
        
        return assignments
    
    def list_user_assignments_in_project(self) -> list[Assignment]:
        try:
            assignments = (self.db
                .query(Assignment)
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
    
