from sqlalchemy.orm import Session, selectinload

from app.core.context import ServiceContext
from app.core.enums import VideoStatusEnum
from app.core.exceptions import ForbiddenError, NotFoundError, ProcessingError
from app.database.models import Assignment, ProjectVideo

class AssignmentService:
    def __init__(self, db: Session, ctx: ServiceContext) -> None:
        self.db = db
        self.ctx = ctx

    def get_assignment(self, assignment_id: str) -> Assignment:
        try:
            assignment = self.db.query(Assignment).filter(Assignment.id == assignment_id).first()
        except Exception as e:
            raise NotFoundError(f"Failed to retrieve assignment: {str(e)}")

        if not assignment:
            raise NotFoundError("Assignment not found.")
        
        if assignment.user_id != self.ctx.user_id and not self.ctx.is_admin:
            raise ForbiddenError("Access denied to this assignment.")
        
        return assignment

    def get_assignment_context(self, assignment_id: str) -> dict:
        assignment = self.get_assignment(assignment_id)

        try:
            video_id = assignment.project_video.video_id
            behaviors = assignment.project_video.project.behaviors
            return {
                "video_id": video_id,
                "behaviors": behaviors,
            }
        except Exception as e:
            raise ProcessingError(f"Failed to retrieve assignment context: {str(e)}")

    def list_user_assignments(self) -> list[Assignment]:
        try:
            assignments = (self.db
                .query(Assignment)
                .options(
                    selectinload(Assignment.project_video).selectinload(ProjectVideo.project),
                    selectinload(Assignment.project_video).selectinload(ProjectVideo.video),
                )
                .filter(Assignment.user_id == self.ctx.user_id)
                .all()
            )
        except Exception as e:
            raise ProcessingError(f"Failed to retrieve assignments: {str(e)}")
        
        return assignments

    def list_user_assignments_in_project(self, project_id: str) -> list[Assignment]:
        try:
            assignments = (
                self.db.query(Assignment)
                .join(ProjectVideo, Assignment.project_video_id == ProjectVideo.id)
                .filter(
                    Assignment.user_id == self.ctx.user_id,
                    ProjectVideo.project_id == project_id,
                )
                .all()
            )
        except Exception as e:
            raise ProcessingError(f"Failed to retrieve assignments: {str(e)}")

        return assignments
    
    def update_assignment_status(self, assignment_id: str, new_status: VideoStatusEnum) -> Assignment:
        assignment = self.get_assignment(assignment_id)

        if assignment.user_id != self.ctx.user_id and not self.ctx.is_admin:
            raise ForbiddenError("Access denied to update this assignment.")
        
        try:
            setattr(assignment, "status", new_status)
            self.db.commit()
            self.db.refresh(assignment)
        except Exception as e:
            raise ProcessingError(f"Failed to update assignment status: {str(e)}")
        
        return assignment
