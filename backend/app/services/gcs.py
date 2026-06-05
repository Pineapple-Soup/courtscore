import datetime
import uuid

from typing import Optional

from app.core.config import settings
from app.core.exceptions import GCSError
from google.cloud import storage
from google.oauth2 import service_account


class GCSService:
    _client: Optional[storage.Client] = None

    def _get_client(self) -> storage.Client:
        if GCSService._client is None:
            credentials = service_account.Credentials.from_service_account_file(
                settings.GOOGLE_APPLICATION_CREDENTIALS
            )
            GCSService._client = storage.Client(credentials=credentials)
        return GCSService._client

    def _get_bucket(self) -> storage.Bucket:
        return self._get_client().bucket(settings.GCS_BUCKET_NAME)

    def upload_video(self, video_path: str) -> tuple[str, str]:
        bucket = self._get_bucket()
        video_id = str(uuid.uuid4())
        blob_name = f"videos/{video_id}.mp4"
        blob = bucket.blob(blob_name)
        blob.chunk_size = 5 * 1024 * 1024  # 5 MB
        
        try:
            blob.upload_from_filename(video_path)
        except Exception as e:
            raise GCSError(f"Failed to upload video to GCS: {str(e)}")

        return video_id, blob_name

    def generate_signed_url(self, blob_name: str) -> str:
        bucket = self._get_bucket()
        blob = bucket.blob(blob_name)
        url = blob.generate_signed_url(
            expiration=datetime.timedelta(hours=3),
            method='GET'
        )
        return url

    def delete_video(self, blob_name: str) -> None:
        bucket = self._get_bucket()
        blob = bucket.blob(blob_name)
        blob.delete()
