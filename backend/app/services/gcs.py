import datetime
import uuid

from app.core.config import settings
from google.cloud import storage
from google.oauth2 import service_account

credentials = service_account.Credentials.from_service_account_file(settings.GOOGLE_APPLICATION_CREDENTIALS)
storage_client = storage.Client(credentials=credentials)

def upload_video_to_gcs(video_path):
    bucket = storage_client.bucket(settings.GCS_BUCKET_NAME)
    video_id = str(uuid.uuid4())
    blob_name = f"videos/{video_id}.mp4"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(video_path)
    return video_id, blob_name

def generate_signed_url(blob_name):
    bucket = storage_client.bucket(settings.GCS_BUCKET_NAME)
    blob = bucket.blob(blob_name)
    url = blob.generate_signed_url(expiration=datetime.timedelta(hours=3), method='GET')
    return url

def delete_video_from_gcs(blob_name: str) -> None:
    bucket = storage_client.bucket(settings.GCS_BUCKET_NAME)
    blob = bucket.blob(blob_name)
    blob.delete()