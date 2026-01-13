from app.database.db import Base
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, TIMESTAMP, JSON, UniqueConstraint
from sqlalchemy.sql import func


class Video(Base):
    """
    Represents a video in the shared library.
    Videos are uploaded by global administrators and can be linked to multiple projects.
    """
    __tablename__ = "videos"

    id = Column(String, primary_key=True, index=True)
    src = Column(String, nullable=False, index=True)
    label = Column(String, nullable=False)
    status = Column(String, default="Not Started", nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class Users(Base):
    """
    Represents a user in the system.
    Users can be global administrators or regular users.
    Project-level roles are managed through ProjectMember.
    """
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    role = Column(String, nullable=False, default="user")
    email = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    google_sub = Column(String, unique=True, index=True, nullable=True)
    last_login_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class Project(Base):
    """
    Represents a project that contains videos and members.
    Projects enable organized, double-blind annotation workflows.
    """
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    annotators_per_video = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


class ProjectMember(Base):
    """
    Links users to projects with role-based permissions.
    Roles: 'owner' (can manage project) or 'member' (can annotate assigned videos).
    """
    __tablename__ = "project_members"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False, default="member")
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="unique_project_member"),
    )


class ProjectVideo(Base):
    """
    Links videos from the shared library to specific projects.
    Creates a unique annotation scope - same video can exist in multiple projects
    with independent annotations.
    """
    __tablename__ = "project_videos"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    video_id = Column(String, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("project_id", "video_id", name="unique_project_video"),
    )


class VideoAssignment(Base):
    """
    Tracks which members are assigned to annotate which project-videos.
    Assignments are created automatically using the balanced pairing algorithm.
    """
    __tablename__ = "video_assignments"

    id = Column(String, primary_key=True, index=True)
    project_video_id = Column(String, ForeignKey("project_videos.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("project_video_id", "user_id", name="unique_video_assignment"),
    )


class Annotations(Base):
    """
    Stores annotation data for a project-video by a specific user.
    Annotations are scoped to ProjectVideo (not Video) to enable independent
    annotation sets per project. Submitted annotations are locked.
    """
    __tablename__ = "annotations"

    id = Column(String, primary_key=True, index=True)
    project_video_id = Column(String, ForeignKey("project_videos.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    segments = Column(JSON, nullable=False)
    submitted = Column(Boolean, nullable=False, default=False)
    submitted_at = Column(TIMESTAMP, nullable=True)
    updated_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("project_video_id", "user_id", name="unique_project_video_user_annotation"),
    )

