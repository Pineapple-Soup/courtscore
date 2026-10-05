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
    """Redirect the user to Google's OAuth 2.0 authorization endpoint."""
    state = auth.generate_oauth_state()
    nonce = auth.generate_oauth_nonce()
    url = auth.get_google_auth_url(state, nonce)

    response = RedirectResponse(url)
    auth.set_oauth_cookies(response, state, nonce)

    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db),
    code: str | None = None,
    state: str | None = None
) -> RedirectResponse:

    if not code or not state:
        raise HTTPException(status_code=400, detail="Invalid OAuth callback")

    stored_state = request.cookies.get(auth.OAUTH_STATE_COOKIE)
    stored_nonce = request.cookies.get(auth.OAUTH_NONCE_COOKIE)

    auth.verify_oauth_state(state, stored_state)

    if not stored_nonce:
        raise HTTPException(status_code=400, detail="Invalid OAuth transaction")

    try:
        token_response = await auth.exchange_code_for_tokens(code)
        id_token_str = token_response.get("id_token")

        if not id_token_str:
            raise HTTPException(status_code=400, detail="Google authentication failed")

        id_info = google_id_token.verify_oauth2_token(id_token_str, google_requests.Request(), settings.AUTH_GOOGLE_ID)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Google authentication failed")

    auth.verify_oauth_nonce(id_info.get("nonce"), stored_nonce)

    user = auth.user_from_google(id_info, db)
    token = auth.create_access_token(str(user.id))

    # Set cookie
    response = RedirectResponse(settings.FRONTEND_URL + "/dashboard")
    auth.set_auth_cookie(response, token)
    auth.clear_oauth_cookies(response)
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
    token = request.cookies.get(auth.AUTH_COOKIE_NAME)
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
    auth.clear_auth_cookie(response)
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
