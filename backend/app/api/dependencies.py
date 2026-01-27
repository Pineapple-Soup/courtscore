from app.services.auth import get_current_user
from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.context import ServiceContext
from app.database.db import get_db
from app.database.models import User
from app.services.annotation import AnnotationService
from app.services.gcs import GCSService
from app.services.preprocess import PreprocessService
from app.services.project import ProjectService
from app.services.video import VideoService


def get_service_context(user: User = Depends(get_current_user)) -> ServiceContext:
    return ServiceContext(user_id=str(user.id), is_admin=(str(user.role) == "admin"))

def get_annotation_service(db: Session = Depends(get_db)) -> AnnotationService:
    return AnnotationService(db=db)

def get_gcs_service() -> GCSService:
    return GCSService()

def get_preprocess_service() -> PreprocessService:
    return PreprocessService(model_path=settings.YOLO_MODEL_PATH, conf_threshold=0.5)

def get_project_service(
    db: Session = Depends(get_db), 
    ctx: ServiceContext = Depends(get_service_context)
) -> ProjectService:
    return ProjectService(db=db, ctx=ctx)

def get_video_service(
    db: Session = Depends(get_db),
    preprocess_service: PreprocessService = Depends(get_preprocess_service),
    gcs_service: GCSService = Depends(get_gcs_service)
) -> VideoService:
    return VideoService(db=db, preprocess_service=preprocess_service, gcs_service=gcs_service)
