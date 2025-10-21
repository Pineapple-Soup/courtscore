from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    AUTH_GOOGLE_ID: str
    AUTH_GOOGLE_SECRET: str
    GOOGLE_APPLICATION_CREDENTIALS: str
    DATABASE_URL: str
    UPLOAD_DIRECTORY: str = "tmp"
    OUTPUT_PATH: str = "out"
    GCS_BUCKET_NAME: str
    YOLO_MODEL_PATH: str

    class Config:
        env_file = ".env"

settings = Settings()