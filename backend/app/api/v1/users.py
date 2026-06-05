from fastapi import APIRouter, Depends

from app.api.dependencies import get_user_service
from app.database.models import User
from app.database.schemas import UserResponse
from app.services.auth import require_role
from app.services.user import UserService

router = APIRouter(prefix="/users")

@router.get("", response_model=list[UserResponse])
def list_users(
    _: User = Depends(require_role("admin")),
    user_service: UserService = Depends(get_user_service)
) -> list[UserResponse]:
    users = user_service.list_users()
    return [UserResponse.model_validate(u) for u in users]

@router.get("/promote")
def promote_user(user_id: str,
 _: User = Depends(require_role("admin")), user_service: UserService = Depends(get_user_service)) -> UserResponse:
    user = user_service.promote_to_admin(user_id)
    return UserResponse.model_validate(user)

@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    _: User = Depends(require_role("admin")),
    user_service: UserService = Depends(get_user_service),
) -> None:
    user_service.delete_user(user_id)