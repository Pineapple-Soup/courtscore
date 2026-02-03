import heapq

from uuid import uuid4
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ProcessingError
from app.database.models import Assignment, Project, ProjectMember, ProjectVideo

class AssignmentService:
    def __init__(self, db: Session, project_id: str) -> None:
        self.db = db
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
