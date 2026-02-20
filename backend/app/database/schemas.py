import re
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator
from pydantic.alias_generators import to_camel, to_snake
from typing import Self
from app.core.config import settings


class VideoStatusEnum(str, Enum):
    NOT_STARTED = "Not Started"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"

class BaseRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, from_attributes=True)

class BaseResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_snake, from_attributes=True)

# Segment
class SegmentSchema(BaseRequest):
    behavior: str
    start_time: float
    end_time: float | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_time_range(self) -> Self:
        if self.end_time is not None and self.end_time < self.start_time:
            raise ValueError("endTime must be greater than or equal to startTime")
        return self


# Auth
class LoginRequest(BaseRequest):
    email: EmailStr
    password: str

class PasswordRequest(BaseRequest):
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

class SignupRequest(PasswordRequest):
    email: EmailStr
    name: str

class UserResponse(BaseResponse):
    id: str
    email: str
    name: str | None = None
    role: str


# Video
class VideoResponse(BaseResponse):
    id: str
    src: str
    label: str
    description: str | None = None
    created_at: datetime | None = None


# Annotation
class AnnotationRequest(BaseRequest):
    segments: list[SegmentSchema] = []

class AnnotationResponse(BaseResponse):
    id: str
    assignment_id: str
    segments: list[SegmentSchema]
    submitted: bool = False
    submitted_at: datetime | None = None
    updated_at: datetime


# Project
class ProjectRequest(BaseRequest):
    name: str
    description: str | None = None
    annotators_per_video: int

    @field_validator("annotators_per_video")
    @classmethod
    def validate_annotators(cls, v: int) -> int:
        if v < 1:
            raise ValueError("annotators_per_video must be at least 1")
        return v

class ProjectResponse(BaseResponse):
    id: str
    name: str
    description: str | None = None
    annotators_per_video: int
    members: list[UserResponse] = []
    created_at: datetime | None = None

class ProjectMemberRequest(BaseRequest):
    email: str  # Add member by email instead of user_id

class ProjectMemberResponse(BaseResponse):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    user_id: str
    created_at: datetime | None = None
    # Joined user fields
    email: str | None = None
    name: str | None = None


class ProjectVideoRequest(BaseRequest):
    video_id: str


class ProjectVideoResponse(BaseResponse):
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


class AssignmentResponse(BaseResponse):
    id: str
    project_video_id: str
    user_id: str
    created_at: datetime | None = None
    status: VideoStatusEnum = VideoStatusEnum.NOT_STARTED


# Misc
class SignedUrlResponse(BaseResponse):
    signed_url: str
    expiration: int

class HealthResponse(BaseResponse):
    status: str
    database: str