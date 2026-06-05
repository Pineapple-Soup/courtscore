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
    """Raised when processing fails."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class GCSError(Exception):
    """Raised when GCS operations fail."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

class NotFoundError(Exception):
    """Raised when a resource is not found."""
    def __init__(self, message: str = "Resource not found"):
        self.message = message
        super().__init__(message)

class ForbiddenError(Exception):
    """Raised when user lacks permission for an action."""
    def __init__(self, message: str = "Permission denied"):
        self.message = message
        super().__init__(message)

class ConflictError(Exception):
    """Raised when a resource already exists."""
    def __init__(self, message: str = "Resource already exists"):
        self.message = message
        super().__init__(message)

class BadRequestError(Exception):
    """Raised when request is invalid."""
    def __init__(self, message: str = "Bad request"):
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


async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


async def forbidden_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=403, content={"detail": str(exc)})


async def conflict_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": str(exc)})


async def bad_request_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})
