from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)) -> HealthResponse:
    try:
        db.execute(text("SELECT 1"))
        return HealthResponse(status="healthy", database="connected")
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")
