from fastapi import Request
from fastapi.responses import JSONResponse


class VideoNotFoundError(Exception):
    """Raised when a video is not found in the database."""
    def __init__(self, video_id: str):
        self.video_id = video_id
        super().__init__(f"Video with id '{video_id}' not found")


class AnnotationNotFoundError(Exception):
    """Raised when an annotation is not found in the database."""
    def __init__(self, video_id: str):
        self.video_id = video_id
        super().__init__(f"Annotation for video '{video_id}' not found")


class ProcessingError(Exception):
    """Raised when video processing fails."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class GCSError(Exception):
    """Raised when GCS operations fail."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


# FastAPI Exception handlers
async def video_not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


async def annotation_not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


async def processing_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": f"Processing failed: {exc}"})


async def gcs_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": f"Storage error: {exc}"})
