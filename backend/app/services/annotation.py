import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import AnnotationNotFoundError, BadRequestError, ConflictError, ForbiddenError
from app.database.models import Annotation, Assignment
from app.database.schemas import SegmentSchema


class AnnotationService:
    def __init__(self, db: Session):
        self.db = db

    def _verify_assignment(self, assignment_id: str, user_id: str) -> None:
        """Verify user is assigned to this project video."""
        assignment = self.db.query(Assignment).filter(Assignment.id == assignment_id).first()
        if not assignment:
            raise ForbiddenError("Assignment not found")
        if assignment.user_id != user_id:
            raise ForbiddenError("You are not assigned to this video")

    def get(self, assignment_id: str, user_id: str) -> Annotation:
        """Get annotation corresponding to an assignment. Raises AnnotationNotFoundError if not found."""
        self._verify_assignment(assignment_id, user_id)
        
        annotation = self.db.query(Annotation).filter(Annotation.assignment_id == assignment_id).first()
        if not annotation:
            raise AnnotationNotFoundError(assignment_id)
        return annotation

    def create(
        self, assignment_id: str, user_id: str, segments: list[SegmentSchema]
    ) -> Annotation:
        """Create new annotation for an assignment. Raises ConflictError if already exists."""
        self._verify_assignment(assignment_id, user_id)
        existing = self.db.query(Annotation).filter(Annotation.assignment_id == assignment_id).first()
        if existing:
            raise ConflictError("Annotation already exists for this assignment")
        
        segments_data = [seg.model_dump() for seg in segments] if segments else []
        now = datetime.now(timezone.utc)
        new_annotation = Annotation(
            id=str(uuid.uuid4()),
            assignment_id=assignment_id,
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
        self, assignment_id: str, user_id: str, segments: list[SegmentSchema]
    ) -> Annotation:
        """Update annotation segments. Fails if already submitted."""
        annotation = self.get(assignment_id, user_id)
        if annotation.submitted:
            raise ForbiddenError("Cannot modify a submitted annotation")
        
        setattr(annotation, "segments", [seg.model_dump() for seg in segments])
        setattr(annotation, "updated_at", datetime.now(timezone.utc))
        self.db.commit()
        self.db.refresh(annotation)
        return annotation

    def submit(self, assignment_id: str, user_id: str) -> Annotation:
        """Submit and lock an annotation. Cannot be undone."""
        annotation = self.get(assignment_id, user_id)
        if annotation.submitted:
            raise BadRequestError("Annotation is already submitted")
        
        now = datetime.now(timezone.utc)
        setattr(annotation, "submitted", True)
        setattr(annotation, "submitted_at", now)
        setattr(annotation, "updated_at", now)
        self.db.commit()
        self.db.refresh(annotation)
        return annotation
