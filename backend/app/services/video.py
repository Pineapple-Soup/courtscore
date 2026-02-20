import os
import shutil

from sqlalchemy.orm import Session
from typing import BinaryIO, Optional, Sequence

from app.core.config import settings
from app.core.context import ServiceContext
from app.core.exceptions import ForbiddenError, ProcessingError, VideoNotFoundError
from app.database.models import Video
from app.services.gcs import GCSService
from app.services.preprocess import PreprocessService


class VideoService:
    def __init__(self, db: Session, ctx: ServiceContext, preprocess_service: PreprocessService, gcs_service: GCSService):
        self.db = db
        self.ctx = ctx
        self.gcs_service = gcs_service or GCSService()
        self.preprocess_service = preprocess_service

    def _upload_multiple_videos(self, file_path_list: list[str], label: Optional[str], description: Optional[str]) -> list[Video]:
        uploaded_videos: list[Video] = []
        try:
            for idx, file_path in enumerate(file_path_list):
                id, gcp_path = self.gcs_service.upload_video(file_path)
                new_video_label = f"{label} {idx+1}" if label else os.path.splitext(os.path.basename(file_path))[0]
                new_video = Video(id=id, src=gcp_path, label=new_video_label, description=description)
                self.db.add(new_video)
                uploaded_videos.append(new_video)
            self.db.commit()
            for v in uploaded_videos:
                self.db.refresh(v)
            return uploaded_videos
        except Exception:
            self.db.rollback()
            raise ProcessingError("Failed to upload videos. Transaction rolled back.")

    def _cleanup_files(self, file_path_list: list[str]) -> None:
        for file_path in file_path_list:
            if os.path.exists(file_path):
                os.remove(file_path)

    def _require_admin(self) -> None:
        """Verify user is an admin."""
        if not self.ctx.is_admin:
            raise ForbiddenError("Admin privileges required to access this resource")

    def list_all(self) -> Sequence[Video]:
        self._require_admin()
        
        return self.db.query(Video).all()

    def get(self, video_id: str) -> Video:
        self._require_admin()

        video = self.db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise VideoNotFoundError(video_id)
        return video

    def delete(self, video_id: str) -> None:
        self._require_admin()

        video = self.get(video_id)
        self.gcs_service.delete_video(str(video.src))
        self.db.delete(video)
        self.db.commit()

    def get_signed_url(self, video_id: str) -> str:
        video = self.get(video_id)
        return self.gcs_service.generate_signed_url(str(video.src))
    
    def upload_video(self, file_path: str, label: Optional[str], description: Optional[str] = None) -> list[Video]:
        self._require_admin()

        file_path_list: list[str] = self.preprocess_service.process_video(file_path, settings.OUTPUT_PATH)
        created_videos: list[Video] = self._upload_multiple_videos(file_path_list, label, description)
        self._cleanup_files(file_path_list + [file_path])

        return created_videos

    def save_upload_locally(self, file: BinaryIO, filename: str) -> str:
        safe_filename = os.path.basename(filename)
        file_location = os.path.join(settings.UPLOAD_DIRECTORY, safe_filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file, buffer)
        return file_location
