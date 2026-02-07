from fastapi import APIRouter

from app.api.v1 import annotations, assignments, auth, health, projects, videos

# Main v1 router
api_router = APIRouter(prefix="/api/v1")

# Include sub-routers
api_router.include_router(annotations.router)
api_router.include_router(assignments.router)
api_router.include_router(projects.router)
api_router.include_router(videos.router)

# Auth router
auth_router = auth.router

# Health router
health_router = health.router
