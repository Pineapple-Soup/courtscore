import re
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator
from typing import Self
from app.core.config import settings


class VideoStatusEnum(str, Enum):
    NOT_STARTED = "Not Started"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"


# Segment
class SegmentSchema(BaseModel):
    behavior: str
    startTime: float
    endTime: float | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_time_range(self) -> Self:
        if self.endTime is not None and self.endTime < self.startTime:
            raise ValueError("endTime must be greater than or equal to startTime")
        return self


# Auth
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SetPasswordRequest(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < settings.MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {settings.MIN_PASSWORD_LENGTH} characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < settings.MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {settings.MIN_PASSWORD_LENGTH} characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str | None = None
    role: str


# Video
class VideoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    src: str
    label: str
    description: str | None = None
    created_at: datetime | None = None


# Annotation
class AnnotationRequest(BaseModel):
    segments: list[SegmentSchema] = []

class AnnotationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    assignment_id: str
    segments: list[SegmentSchema]
    submitted: bool = False
    submitted_at: datetime | None = None
    updated_at: datetime


# Project
class ProjectRequest(BaseModel):
    name: str
    description: str | None = None
    annotators_per_video: int

    @field_validator("annotators_per_video")
    @classmethod
    def validate_annotators(cls, v: int) -> int:
        if v < 1:
            raise ValueError("annotators_per_video must be at least 1")
        return v

class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None = None
    annotators_per_video: int
    created_at: datetime | None = None

class ProjectMemberRequest(BaseModel):
    email: str  # Add member by email instead of user_id

class ProjectMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    user_id: str
    created_at: datetime | None = None
    # Joined user fields
    email: str | None = None
    name: str | None = None


class ProjectVideoRequest(BaseModel):
    video_id: str


class ProjectVideoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    video_id: str
    created_at: datetime | None = None
    # Joined video fields
    label: str | None = None
    src: str | None = None
    # Assignment info
    assignments: list[str] = []


class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_video_id: str
    user_id: str
    created_at: datetime | None = None
    status: VideoStatusEnum = VideoStatusEnum.NOT_STARTED


# Misc
class SignedUrlResponse(BaseModel):
    signed_url: str
    expiration: int

class HealthResponse(BaseModel):
    status: str
    database: str