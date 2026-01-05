from app.database.db import Base
from sqlalchemy import Column, ForeignKey, String, TIMESTAMP, JSON, UniqueConstraint
from sqlalchemy.sql import func


class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, index=True)
    src = Column(String, nullable=False)
    label = Column(String, nullable=False)
    status = Column(String, default="Not Started", nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Users(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    role = Column(String, nullable=False, default="user")
    email = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    google_sub = Column(String, unique=True, index=True, nullable=True)
    last_login_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Annotations(Base):
    __tablename__ = "annotations"

    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    segments = Column(JSON, nullable=False)

    __table_args__ = (
        UniqueConstraint("video_id", "user_id", name="unique_video_user_annotation"),
    )