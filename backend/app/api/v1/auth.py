import secrets
import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.db import get_db
from app.database.models import User
from app.database.schemas import (
    SignupRequest,
    LoginRequest,
    PasswordRequest,
    UserResponse,
)
from app.services import auth

router = APIRouter(prefix="/auth")


@router.post("/signup", response_model=UserResponse)
def signup(
    payload: SignupRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> UserResponse:
    user = auth.create_user_with_password(
        email=payload.email,
        password=payload.password,
        name=payload.name,
        db=db
    )
    token = auth.create_access_token(str(user.id))
    auth.set_auth_cookie(response, token)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=UserResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> UserResponse:
    user = auth.authenticate_user(
        email=payload.email,
        password=payload.password,
        db=db
    )
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials. Please check your email/password and try again"
        )
    token = auth.create_access_token(str(user.id))
    auth.set_auth_cookie(response, token)
    return UserResponse.model_validate(user)
    

@router.get("/google/login")
def google_login() -> RedirectResponse:
    base = "https://accounts.google.com/o/oauth2/v2/auth"
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.AUTH_GOOGLE_ID,
        "redirect_uri": settings.AUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }

    url = f"{base}?{urllib.parse.urlencode(params)}"

    response = RedirectResponse(url)
    response.set_cookie(
        "oauth_state",
        state,
        httponly=True,
        secure=settings.IS_PRODUCTION,
        samesite="lax",
    )

    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db),
    code: str | None = None,
    state: str | None = None
) -> RedirectResponse:
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")

    stored_state = request.cookies.get("oauth_state")
    if not stored_state or stored_state != state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    # Exchange code for tokens
    token_response = await auth.exchange_code_for_tokens(code)
    id_token_str = token_response.get("id_token")
    if not id_token_str:
        raise HTTPException(status_code=400, detail="No id_token returned from provider")

    # Verify id_token locally
    try:
        id_info = google_id_token.verify_oauth2_token(
            id_token_str, google_requests.Request(), settings.AUTH_GOOGLE_ID
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid id_token: {e}")

    user = auth.user_from_google(id_info, db)
    token = auth.create_access_token(str(user.id))

    # Set cookie
    response = RedirectResponse(settings.FRONTEND_URL + "/dashboard")
    auth.set_auth_cookie(response, token)
    response.delete_cookie("oauth_state")
    return response


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    user: User = Depends(auth.get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(user)


@router.post("/refresh")
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    """Issue a fresh JWT if the current session cookie is still valid."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")

    payload = auth.decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Verify the user still exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_token = auth.create_access_token(str(user.id))
    auth.set_auth_cookie(response, new_token)
    return {"success": True}


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie("access_token")
    return {"success": True}


@router.post("/set_password")
def set_password(
    payload: PasswordRequest,
    user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    setattr(user, "hashed_password", auth.hash_password(payload.password))
    db.commit()
    db.refresh(user)
    return {"success": True}
