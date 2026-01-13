import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import AnnotationNotFoundError
from app.database.models import Annotations
from app.database.schemas import SegmentSchema


class AnnotationService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_video_id(self, video_id: str) -> Annotations:
        annotation = self.db.query(Annotations).filter(
            Annotations.video_id == video_id
        ).first()
        if not annotation:
            raise AnnotationNotFoundError(video_id)
        return annotation

    def create(
        self, video_id: str, user_id: str, segments: list[SegmentSchema]
    ) -> Annotations:
        segments_data = [seg.model_dump() for seg in segments]
        new_annotation = Annotations(
            id=str(uuid.uuid4()),
            video_id=video_id,
            user_id=user_id,
            segments=segments_data
        )
        self.db.add(new_annotation)
        self.db.commit()
        self.db.refresh(new_annotation)
        return new_annotation

    def update(self, video_id: str, segments: list[SegmentSchema]) -> Annotations:
        annotation = self.get_by_video_id(video_id)
        setattr(annotation, "segments", [seg.model_dump() for seg in segments])
        self.db.commit()
        self.db.refresh(annotation)
        return annotation

    def get_by_video_and_user(self, video_id: str, user_id: str) -> Annotations | None:
        return self.db.query(Annotations).filter(
            Annotations.video_id == video_id,
            Annotations.user_id == user_id
        ).first()
