import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import AnnotationNotFoundError, ForbiddenError, BadRequestError
from app.database.models import Annotations, VideoAssignment
from app.database.schemas import SegmentSchema


class AnnotationService:
    def __init__(self, db: Session):
        self.db = db

    def _verify_assignment(self, project_video_id: str, user_id: str) -> None:
        """Verify user is assigned to this project video."""
        assignment = self.db.query(VideoAssignment).filter(
            VideoAssignment.project_video_id == project_video_id,
            VideoAssignment.user_id == user_id
        ).first()
        if not assignment:
            raise ForbiddenError("You are not assigned to this video")

    def _verify_not_submitted(self, annotation: Annotations) -> None:
        """Verify annotation has not been submitted."""
        if annotation.submitted:
            raise ForbiddenError("Cannot modify a submitted annotation")

    def get_by_project_video(self, project_video_id: str, user_id: str) -> Annotations:
        """Get annotation for a project video by the current user."""
        self._verify_assignment(project_video_id, user_id)
        
        annotation = self.db.query(Annotations).filter(
            Annotations.project_video_id == project_video_id,
            Annotations.user_id == user_id
        ).first()
        if not annotation:
            raise AnnotationNotFoundError(project_video_id)
        return annotation

    def get_or_create(self, project_video_id: str, user_id: str) -> Annotations:
        """Get existing annotation or create a new empty one."""
        self._verify_assignment(project_video_id, user_id)
        
        try:
            return self.get_by_project_video(project_video_id, user_id)
        except AnnotationNotFoundError:
            return self.create(project_video_id, user_id, [])

    def create(
        self, project_video_id: str, user_id: str, segments: list[SegmentSchema]
    ) -> Annotations:
        """Create a new annotation."""
        self._verify_assignment(project_video_id, user_id)
        
        # Check if annotation already exists
        try:
            self.get_by_project_video(project_video_id, user_id)
        except:
            raise BadRequestError("Annotation already exists for this video")
        
        segments_data = [seg.model_dump() for seg in segments]
        now = datetime.now(timezone.utc)
        new_annotation = Annotations(
            id=str(uuid.uuid4()),
            project_video_id=project_video_id,
            user_id=user_id,
            segments=segments_data,
            submitted=False,
            submitted_at=None,
            updated_at=now
        )
        self.db.add(new_annotation)
        self.db.commit()
        self.db.refresh(new_annotation)
        return new_annotation

    def update(
        self, project_video_id: str, user_id: str, segments: list[SegmentSchema]
    ) -> Annotations:
        """Update annotation segments. Fails if already submitted."""
        annotation = self.get_by_project_video(project_video_id, user_id)
        self._verify_not_submitted(annotation)
        
        setattr(annotation, "segments", [seg.model_dump() for seg in segments])
        setattr(annotation, "updated_at", datetime.now(timezone.utc))
        self.db.commit()
        self.db.refresh(annotation)
        return annotation

    def submit(self, project_video_id: str, user_id: str) -> Annotations:
        """Submit and lock an annotation. Cannot be undone."""
        annotation = self.get_by_project_video(project_video_id, user_id)
        
        if annotation.submitted:
            raise BadRequestError("Annotation already submitted")
        
        now = datetime.now(timezone.utc)
        setattr(annotation, "submitted", True)
        setattr(annotation, "submitted_at", now)
        setattr(annotation, "updated_at", now)
        self.db.commit()
        self.db.refresh(annotation)
        return annotation
