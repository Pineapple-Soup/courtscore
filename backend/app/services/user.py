from sqlalchemy.orm import Session, selectinload

from app.core.context import ServiceContext
from app.core.exceptions import ForbiddenError, NotFoundError, BadRequestError
from app.database.models import User, ProjectMember

class UserService:
    def __init__(self, db: Session, ctx: ServiceContext):
        self.db = db
        self.ctx = ctx
    
    def _require_admin(self) -> None:
        if not self.ctx.is_admin:
            raise ForbiddenError("Admin privileges required to access this resource")

    def list_users(self) -> list[User]:
        self._require_admin()
        return self.db.query(User).options(selectinload(User.project_links)).all()
    
    def promote_to_admin(self, user_id: str) -> None:
        self._require_admin()
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User not found")

        # Check if the user is a member of any projects
        membership_exists = self.db.query(ProjectMember).filter(ProjectMember.user_id == user_id).first()
        if membership_exists:
            raise BadRequestError("Cannot promote user who is a member of one or more projects")

        setattr(user, "role", "admin")
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete_user(self, user_id: str) -> None:
        self._require_admin()
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User not found")
        
        # Check if the user is a member of any projects
        membership_exists = self.db.query(ProjectMember).filter(ProjectMember.user_id == user_id).first()
        if membership_exists:
            raise BadRequestError("Cannot delete user who is a member of one or more projects")
            
        self.db.delete(user)
        self.db.commit()