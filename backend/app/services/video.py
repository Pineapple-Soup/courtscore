import os
import shutil
from typing import BinaryIO, Sequence

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import VideoNotFoundError
from app.database.models import Video
from app.services.gcs import GCSService
from app.services.preprocess import PreprocessService


class VideoService:
    def __init__(self, db: Session, preprocess_service: PreprocessService, gcs_service: GCSService):
        self.db = db
        self.gcs_service = gcs_service or GCSService()
        self.preprocess_service = preprocess_service

    def list_all(self) -> Sequence[Video]:
        return self.db.query(Video).all()

    def get_by_id(self, video_id: str) -> Video:
        video = self.db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise VideoNotFoundError(video_id)
        return video

    def get_signed_url(self, video_id: str) -> str:
        video = self.get_by_id(video_id)
        return self.gcs_service.generate_signed_url(str(video.src))

    def _upload_multiple_videos(self, file_path_list: list[str]) -> list[Video]:
        uploaded_videos: list[Video] = []
        for file_path in file_path_list:
            id, gcp_path = self.gcs_service.upload_video(file_path)
            new_video = Video(id=id, src=gcp_path, label=os.path.splitext(os.path.basename(file_path))[0])
            self.db.add(new_video)
            self.db.commit()
            self.db.refresh(new_video)
            uploaded_videos.append(new_video)
        
        return uploaded_videos

    def _cleanup_files(self, file_path_list: list[str]) -> None:
        for file_path in file_path_list:
            if os.path.exists(file_path):
                os.remove(file_path)
    
    def upload_video(self, file_path: str) -> list[Video]:
        file_path_list: list[str] = self.preprocess_service.process_video(file_path, settings.OUTPUT_PATH)
        created_videos: list[Video] = self._upload_multiple_videos(file_path_list)
        self._cleanup_files(file_path_list + [file_path])

        return created_videos

    def save_upload_locally(self, file: BinaryIO, filename: str) -> str:
        safe_filename = os.path.basename(filename)
        file_location = os.path.join(settings.UPLOAD_DIRECTORY, safe_filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file, buffer)
        return file_location
