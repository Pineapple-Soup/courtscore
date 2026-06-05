from sqlalchemy.orm import Session

from app.core.context import ServiceContext
from app.core.exceptions import ForbiddenError, NotFoundError
from app.database.models import User

class UserService:
    def __init__(self, db: Session, ctx: ServiceContext):
        self.db = db
        self.ctx = ctx
    
    def _require_admin(self) -> None:
        if not self.ctx.is_admin:
            raise ForbiddenError("Admin privileges required to access this resource")

    def list_users(self) -> list[User]:
        self._require_admin()
        return self.db.query(User).all()
    
    def promote_to_admin(self, user_id: str) -> None:
        self._require_admin()
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User not found")
        setattr(user, "role", "admin")
        self.db.commit()
        self.db.refresh(user)
        return user