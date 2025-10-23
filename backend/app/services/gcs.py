import uuid

from core.config import settings
from google.cloud import storage

storage_client = storage.Client.from_service_account_json(settings.GOOGLE_APPLICATION_CREDENTIALS)

def upload_video_to_gcs(video_path):
    bucket = storage_client.bucket(settings.GCS_BUCKET_NAME)
    video_id = str(uuid.uuid4())
    blob_name = f"videos/{video_id}.mp4"
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(video_path)
    return video_id, blob_name