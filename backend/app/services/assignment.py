import csv
import io

from sqlalchemy.orm import Session, selectinload, joinedload

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

    @staticmethod
    def _build_time_index(segments: list[dict], max_time: int) -> dict[int, list]:
        index = {t: [] for t in range(max_time + 1)}

        for segment in segments:
            start = max(0, round(segment.get("start_time", 0)))
            end = min(max_time, round(segment.get("end_time", max_time)))

            for t in range(start, end + 1):
                index[t].append(segment.get("behavior", {}))

        return index

    def export_assignment(self, assignment_id: str) :
        assignment = self.db.query(Assignment).options(
            joinedload(Assignment.annotation),
            selectinload(Assignment.project_video).options(
                selectinload(ProjectVideo.project),
                selectinload(ProjectVideo.video),
            ),
            selectinload(Assignment.user),
        ).filter(Assignment.id == assignment_id).first()

        if not assignment:
            raise NotFoundError("Assignment not found.")
        
        if assignment.user_id != self.ctx.user_id and not self.ctx.is_admin:
            raise ForbiddenError("Access denied to this assignment.")
        
        behavior_labels = [behavior.get("name", "") for behavior in assignment.project_video.project.behaviors or []]
        n = len(behavior_labels)

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["time", *behavior_labels])

        def format_time(seconds: int) -> str:
            return f"{seconds // 60}:{seconds % 60:02d}"
        
        time_index = self._build_time_index(assignment.annotation.segments, max_time=600)
        
        for t in range(0, 601):
            active_behaviors = time_index.get(t, [])
            writer.writerow([
                format_time(t),
                *[
                    n-idx
                    if any(b.get("name") == label for b in active_behaviors)
                    else ""
                    for idx, label in enumerate(behavior_labels)
                ],
            ])

        output.seek(0)

        if self.ctx.is_admin:
            project_name = assignment.project_video.project.name
            video_label = assignment.project_video.video.label
            user_name = assignment.user.name
            filename = (
                f"{project_name}_{video_label}_{user_name}.csv"
            )
        else:
            filename = f"{assignment.id}.csv"

        return iter([output.getvalue()]), filename
        
