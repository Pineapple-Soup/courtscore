from fastapi import APIRouter

from app.api.v1 import videos, annotations, auth, health

# Main v1 router
api_router = APIRouter(prefix="/api/v1")

# Include sub-routers
api_router.include_router(videos.router)
api_router.include_router(annotations.router)

# Auth router
auth_router = auth.router

# Health router
health_router = health.router
