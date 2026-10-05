import bcrypt
import httpx
import secrets
import urllib.parse
import uuid

from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Depends, Response, Request
from jose import jwt, JWTError
from typing import Mapping, Optional, Callable

from app.core.config import settings
from app.database.db import get_db
from app.database.models import User
from sqlalchemy.orm import Session

ALGORITHM = "HS256"
AUTH_COOKIE_NAME = "__Host-access_token" if settings.IS_PRODUCTION else "access_token"
OAUTH_STATE_COOKIE = "__Host-oauth_state" if settings.IS_PRODUCTION else "oauth_state"
OAUTH_NONCE_COOKIE = "__Host-oauth_nonce" if settings.IS_PRODUCTION else "oauth_nonce"


def generate_oauth_state() -> str:
    """Generate a cryptographically secure OAuth state value."""
    return secrets.token_urlsafe(32)

def generate_oauth_nonce() -> str:
    """Generate a cryptographically secure OIDC nonce."""
    return secrets.token_urlsafe(32)

def verify_oauth_state(state: Optional[str], stored_state: Optional[str]) -> None:
    """
    Verify that the OAuth state returned by Google matches the value
    stored in the user's browser.

    Raises HTTPException if invalid.
    """
    if not state or not stored_state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    if not secrets.compare_digest(state, stored_state):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

def verify_oauth_nonce(nonce: Optional[str], stored_nonce: Optional[str]) -> None:
    """
    Verify that the OIDC nonce returned by Google matches the value
    stored in the user's browser.

    Raises HTTPException if invalid.
    """
    if not nonce or not stored_nonce:
        raise HTTPException(status_code=400, detail="Invalid OIDC nonce")

    if not secrets.compare_digest(nonce, stored_nonce):
        raise HTTPException(status_code=400, detail="Invalid OIDC nonce")

def get_google_auth_url(state, nonce) -> str:
    """Construct the Google OAuth 2.0 authorization URL."""
    base = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": settings.AUTH_GOOGLE_ID,
        "redirect_uri": settings.AUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "nonce": nonce,
        "access_type": "offline",
    }

    url = f"{base}?{urllib.parse.urlencode(params)}"
    return url

def clear_oauth_cookies(response: Response) -> None:
    """Clear the oauth_state and oauth_nonce cookies"""
    response.delete_cookie(OAUTH_STATE_COOKIE, path="/")
    response.delete_cookie(OAUTH_NONCE_COOKIE, path="/")

def set_oauth_cookies(response: Response, state: str, nonce: str) -> None:
    """Set the oauth_state and oauth_nonce cookies with proper security attributes"""
    response.set_cookie(
        OAUTH_STATE_COOKIE, 
        state,
        httponly=True,
        secure=settings.IS_PRODUCTION,
        samesite="lax",
        max_age=600,
        path="/",
    )

    response.set_cookie(
        OAUTH_NONCE_COOKIE,
        nonce,
        httponly=True,
        secure=settings.IS_PRODUCTION,
        samesite="lax",
        max_age=600,
        path="/",
    )

def set_auth_cookie(response: Response, token: str) -> None:
    """Set the access_token cookie with proper security attributes"""
    response.set_cookie(
        AUTH_COOKIE_NAME,
        token,
        httponly=True,
        secure=settings.IS_PRODUCTION,
        samesite="lax",
        max_age=settings.AUTH_JWT_EXP_SECONDS,
        path="/",
    )

def clear_auth_cookie(response: Response)   -> None:
    """Clear the access_token cookie"""
    response.delete_cookie(AUTH_COOKIE_NAME, path="/")

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
        payload = jwt.decode(
            token,
            settings.AUTH_JWT_SECRET,
            algorithms=[ALGORITHM],
            options={"leeway": 60},
        )
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {str(e)}")

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

def create_user_with_password(email: str, password: str, name: str, db: Session) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        if getattr(existing, "google_sub", None):
            raise HTTPException(
                status_code=409,
                detail="An account for this email already exists. Please sign in via Google."
            )
        raise HTTPException(status_code=400, detail="User with that email already exists")
    new_user = User(id=str(uuid.uuid4()), email=email, name=name, hashed_password=hash_password(password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def authenticate_user(email: str, password: str, db: Session) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    if user and getattr(user, "google_sub", None) and not getattr(user, "hashed_password", None):
        raise HTTPException(
            status_code=400,
            detail="This account uses Google sign-in. Please log in with Google."
        )
    if not user or not getattr(user, "hashed_password", None):
        return None
    if verify_password(password, str(user.hashed_password)):
        setattr(user, 'last_login_at', datetime.now(timezone.utc))
        db.commit()
        db.refresh(user)
        return user
    return None

def user_from_google(id_info: Mapping, db: Session) -> User:
    sub = id_info.get("sub")
    email = id_info.get("email")
    name = id_info.get("name")

    if not sub:
        raise ValueError("No Google sub")

    user = db.query(User).filter(User.google_sub == sub).first()
    if user:
        # Update last_login_at timestamp
        setattr(user, "last_login_at", datetime.now(timezone.utc))
        db.commit()
        db.refresh(user)
        return user
    
    # Email fallback
    if email:
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Link Google account and update last_login_at
            setattr(user, "google_sub", sub)
            setattr(user, "last_login_at", datetime.now(timezone.utc))
            db.commit()
            db.refresh(user)
            return user

    # Create new user
    now = datetime.now(timezone.utc)
    new_user = User(id=str(uuid.uuid4()), email=email or f"{sub}@unknown", google_sub=sub, name=name, last_login_at=now)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_role(role: str) -> Callable:
    def role_checker(user: User = Depends(get_current_user)) -> User:
        if getattr(user, "role", "user") != role:
            raise HTTPException(status_code=403, detail="Insufficient privileges")
        return user

    return role_checker
