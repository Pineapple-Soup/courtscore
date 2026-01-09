from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.db import get_db
from app.services.video import VideoService
from app.services.annotation import AnnotationService
from app.services.gcs import GCSService
from app.services.preprocess import PreprocessService


def get_annotation_service(db: Session = Depends(get_db)) -> AnnotationService:
    return AnnotationService(db=db)

def get_gcs_service() -> GCSService:
    return GCSService()

def get_preprocess_service() -> PreprocessService:
    return PreprocessService(model_path=settings.YOLO_MODEL_PATH, conf_threshold=0.5)

def get_video_service(
    db: Session = Depends(get_db),
    preprocess_service: PreprocessService = Depends(get_preprocess_service),
    gcs_service: GCSService = Depends(get_gcs_service)
) -> VideoService:
    return VideoService(db=db, preprocess_service=preprocess_service, gcs_service=gcs_service)
