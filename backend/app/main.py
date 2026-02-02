import os
import uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import (
    VideoNotFoundError,
    AnnotationNotFoundError,
    ProcessingError,
    GCSError,
    NotFoundError,
    ForbiddenError,
    ConflictError,
    BadRequestError,
    video_not_found_handler,
    annotation_not_found_handler,
    processing_error_handler,
    gcs_error_handler,
    not_found_handler,
    forbidden_handler,
    conflict_handler,
    bad_request_handler,
)
from app.database.db import init_db
from app.api.v1.router import api_router, auth_router, health_router


app = FastAPI(title="CourtScore API", version="1.0.0")

# Initialize database
init_db()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
app.add_exception_handler(VideoNotFoundError, video_not_found_handler)
app.add_exception_handler(AnnotationNotFoundError, annotation_not_found_handler)
app.add_exception_handler(ProcessingError, processing_error_handler)
app.add_exception_handler(GCSError, gcs_error_handler)
app.add_exception_handler(NotFoundError, not_found_handler)
app.add_exception_handler(ForbiddenError, forbidden_handler)
app.add_exception_handler(ConflictError, conflict_handler)
app.add_exception_handler(BadRequestError, bad_request_handler)

# Create required directories
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(settings.OUTPUT_PATH, exist_ok=True)

# Include routers
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(health_router)


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
