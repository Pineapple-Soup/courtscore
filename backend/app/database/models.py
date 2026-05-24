from app.database.db import Base
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, TIMESTAMP, JSON, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship


class Video(Base):
    """
    Represents a video in the shared library.
    Videos are uploaded by global administrators and can be linked to multiple projects.
    """
    __tablename__ = "videos"

    id = Column(String, primary_key=True, index=True)
    src = Column(String, nullable=False, index=True)
    label = Column(String, nullable=False)    
    description = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    project_links = relationship("ProjectVideo", back_populates="video")


class User(Base):
    """
    Represents a user in the system.
    Users can be global administrators or regular users.
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

    project_links = relationship("ProjectMember", back_populates="user")
    # projects = relationship(
    #     "Project",
    #     secondary="project_members",
    #     back_populates="members",
    #     viewonly=True,
    # )
    assignments = relationship("Assignment", back_populates="user")


class Project(Base):
    """
    Represents a project that contains members and linked videos.
    Projects enable organized, double-blind annotation workflows.
    """
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    behaviors = Column(JSON, nullable=True)
    annotators_per_video = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    project_members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    # members = relationship(
    #     "User",
    #     secondary="project_members",
    #     back_populates="projects",
    #     viewonly=True,
    # )
    project_videos = relationship("ProjectVideo", back_populates="project", cascade="all, delete-orphan")


class ProjectMember(Base):
    """
    Represents the membership of a user in a project.
    Project members can be assigned to annotate project videos.
    """
    __tablename__ = "project_members"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    project = relationship("Project", back_populates="project_members")
    user = relationship("User", back_populates="project_links")

    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="unique_project_member"),
    )


class ProjectVideo(Base):
    """
    Represents a video from the shared library linked to a specific project.
    Project videos can be assigned to multiple members for annotation.
    """
    __tablename__ = "project_videos"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    video_id = Column(String, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    project = relationship("Project", back_populates="project_videos")
    video = relationship("Video", back_populates="project_links")
    assignments = relationship("Assignment", back_populates="project_video", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("project_id", "video_id", name="unique_project_video"),
    )


class Assignment(Base):
    """
    Represents the assignment of a project-video to a user.
    Assignments are created automatically using the balanced pairing algorithm.
    """
    __tablename__ = "assignments"

    id = Column(String, primary_key=True, index=True)
    project_video_id = Column(String, ForeignKey("project_videos.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, nullable=False, default="Not Started")
    created_at = Column(TIMESTAMP, server_default=func.now())

    project_video = relationship("ProjectVideo", back_populates="assignments")
    user = relationship("User", back_populates="assignments")
    annotation = relationship("Annotation", back_populates="assignment", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("project_video_id", "user_id", name="unique_video_assignment"),
    )


class Annotation(Base):
    """
    Represents the annotations made by a user on an assigned project video.
    Annotations are linked to a specific assignment and contain segment data.
    """
    __tablename__ = "annotations"

    id = Column(String, primary_key=True, index=True)
    assignment_id = Column(String, ForeignKey("assignments.id", ondelete="CASCADE"), unique=True, nullable=False)
    segments = Column(JSON, nullable=False)
    submitted = Column(Boolean, nullable=False, default=False)
    submitted_at = Column(TIMESTAMP, nullable=True)
    updated_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    assignment = relationship("Assignment", back_populates="annotation")
