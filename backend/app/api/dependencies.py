from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.context import ServiceContext
from app.database.db import get_db
from app.database.models import User
from app.services.assignment import AssignmentService
from app.services.annotation import AnnotationService
from app.services.auth import get_current_user
from app.services.gcs import GCSService
from app.services.preprocess import PreprocessService
from app.services.project_assignment import ProjectAssignmentService
from app.services.project import ProjectService
from app.services.user import UserService
from app.services.video import VideoService


def get_service_context(user: User = Depends(get_current_user)) -> ServiceContext:
    return ServiceContext(user_id=str(user.id), is_admin=(str(user.role) == "admin"))

def get_annotation_service(
    db: Session = Depends(get_db),
    ctx: ServiceContext = Depends(get_service_context)
) -> AnnotationService:
    return AnnotationService(db=db, ctx=ctx)

def get_assignment_service(
    db: Session = Depends(get_db),
    ctx: ServiceContext = Depends(get_service_context),
) -> AssignmentService:
    return AssignmentService(db=db, ctx=ctx)

def get_project_assignment_service(
    project_id: str,
    db: Session = Depends(get_db),
    ctx: ServiceContext = Depends(get_service_context),
) -> ProjectAssignmentService:
    return ProjectAssignmentService(db=db, ctx=ctx, project_id=project_id)

def get_gcs_service() -> GCSService:
    return GCSService()

def get_preprocess_service() -> PreprocessService:
    return PreprocessService(model_path=settings.YOLO_MODEL_PATH, conf_threshold=0.5)

def get_project_service(
    db: Session = Depends(get_db), 
    ctx: ServiceContext = Depends(get_service_context)
) -> ProjectService:
    return ProjectService(db=db, ctx=ctx)

def get_user_service(
    db: Session = Depends(get_db),
    ctx: ServiceContext = Depends(get_service_context)
) -> UserService:
    return UserService(db=db, ctx=ctx)

def get_video_service(
    db: Session = Depends(get_db),
    ctx: ServiceContext = Depends(get_service_context),
    preprocess_service: PreprocessService = Depends(get_preprocess_service),
    gcs_service: GCSService = Depends(get_gcs_service)
) -> VideoService:
    return VideoService(db=db, ctx=ctx, preprocess_service=preprocess_service, gcs_service=gcs_service)
