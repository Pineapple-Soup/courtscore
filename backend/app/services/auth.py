import httpx
import uuid
import bcrypt

from typing import Mapping, Optional, Callable
from jose import jwt, JWTError
from fastapi import HTTPException, Depends, Request
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.database.db import SessionLocal, get_db
from app.database.models import Users
from sqlalchemy.orm import Session

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(user_id: str, expires_in: Optional[int] = None) -> str:
    if expires_in is None:
        expires_in = settings.AUTH_JWT_EXP_SECONDS

    now = datetime.now(timezone.utc)
    exp = now + timedelta(seconds=expires_in)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }

    return jwt.encode(payload, settings.AUTH_JWT_SECRET, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Mapping:
    try:
        payload = jwt.decode(token, settings.AUTH_JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

async def exchange_code_for_tokens(code: str):
    token_url = "https://oauth2.googleapis.com/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {
        "code": code,
        "client_id": settings.AUTH_GOOGLE_ID,
        "client_secret": settings.AUTH_GOOGLE_SECRET,
        "grant_type": "authorization_code",
        "redirect_uri": settings.AUTH_REDIRECT_URI,
    }

    async with httpx.AsyncClient() as client:
        res = await client.post(
            token_url,
            headers=headers, 
            data=data,
        )

    if res.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to exchange code")
    return res.json()

def user_from_google(id_info: Mapping) -> Users:
    sub = id_info.get("sub")
    email = id_info.get("email")
    name = id_info.get("name")

    db = SessionLocal()
    try:
        user = db.query(Users).filter(Users.google_sub == sub).first()
        if user:
            return user
        # Email fallback
        if email:
            user = db.query(Users).filter(Users.email == email).first()
            if user:
                return user

        # Create new user
        new_user = Users(id=str(uuid.uuid4()), email=email or f"{sub}@unknown", google_sub=sub, name=name)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    finally:
        db.close()

def get_current_user(request: Request, db: Session = Depends(get_db)) -> Users:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.query(Users).filter(Users.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_role(role: str) -> Callable:
    def role_checker(user: Users = Depends(get_current_user)) -> Users:
        if getattr(user, "role", "user") != role:
            raise HTTPException(status_code=403, detail="Insufficient privileges")
        return user

    return role_checker
