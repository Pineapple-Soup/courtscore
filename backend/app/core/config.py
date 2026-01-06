from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    AUTH_REDIRECT_URI: str
    AUTH_JWT_SECRET: str
    AUTH_JWT_EXP_SECONDS: int
    AUTH_GOOGLE_ID: str
    AUTH_GOOGLE_SECRET: str
    GOOGLE_APPLICATION_CREDENTIALS: str
    DATABASE_URL: str
    UPLOAD_DIRECTORY: str = "tmp"
    OUTPUT_PATH: str = "out"
    GCS_BUCKET_NAME: str
    YOLO_MODEL_PATH: str
    FRONTEND_URL: str
    BACKEND_URL: str
    
    # Security settings
    IS_PRODUCTION: bool = True 
    MIN_PASSWORD_LENGTH: int = 8

    class Config:
        env_file = ".env"

settings = Settings()