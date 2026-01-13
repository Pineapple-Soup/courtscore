import re
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator
from typing import Self
from app.core.config import settings


class BehaviorEnum(int, Enum):
    ORIENTING = 1
    FOLLOWING = 2
    TAPPING = 3
    SINGING = 4
    LICKING = 5
    ATT_COPULATION = 6
    SUC_COPULATION = 7


class VideoStatusEnum(str, Enum):
    NOT_STARTED = "Not Started"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"


# Segment
class SegmentSchema(BaseModel):
    behavior: BehaviorEnum
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

class AuthResponse(BaseModel):
    success: bool
    user: UserResponse


# Video
class VideoUpdateRequest(BaseModel):
    status: VideoStatusEnum


class VideoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    src: str
    label: str
    status: str
    description: str | None = None
    created_at: datetime | None = None


# Annotation

class AnnotationCreateRequest(BaseModel):
    project_video_id: str
    segments: list[SegmentSchema] = []

class AnnotationUpdateRequest(BaseModel):
    segments: list[SegmentSchema] = []

class AnnotationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_video_id: str
    user_id: str
    segments: list[SegmentSchema]
    submitted: bool = False
    submitted_at: datetime | None = None
    updated_at: datetime

class AnnotationSubmitResponse(BaseModel):
    id: str
    project_video_id: str
    submitted: bool
    submitted_at: datetime
    updated_at: datetime


# Project

class ProjectMemberRoleEnum(str, Enum):
    OWNER = "owner"
    MEMBER = "member"


class ProjectCreateRequest(BaseModel):
    name: str
    description: str | None = None
    annotators_per_video: int

    @field_validator("annotators_per_video")
    @classmethod
    def validate_annotators(cls, v: int) -> int:
        if v < 1:
            raise ValueError("annotators_per_video must be at least 1")
        return v


class ProjectUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None = None
    owner_id: str
    annotators_per_video: int
    created_at: datetime | None = None


class ProjectDetailResponse(ProjectResponse):
    member_count: int = 0
    video_count: int = 0
    role: str | None = None  # Current user's role in the project


class ProjectMemberAddRequest(BaseModel):
    user_id: str
    role: ProjectMemberRoleEnum = ProjectMemberRoleEnum.MEMBER


class ProjectMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    user_id: str
    role: str
    created_at: datetime | None = None
    # Joined user fields
    email: str | None = None
    name: str | None = None


class ProjectVideoLinkRequest(BaseModel):
    video_id: str


class VideoAssignmentResponse(BaseModel):
    user_id: str


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
    assignments: list[VideoAssignmentResponse] = []


class MyProjectVideoResponse(BaseModel):
    """Response for project videos from member's perspective."""
    model_config = ConfigDict(from_attributes=True)

    id: str  # project_video_id
    video_id: str
    label: str
    src: str
    created_at: datetime | None = None
    is_assigned_to_me: bool = False
    my_annotation_status: str = "not_started"  # not_started, in_progress, submitted


class AnnotatorProgressResponse(BaseModel):
    """Revealed only when all N annotations are submitted."""
    user_id: str
    name: str | None = None
    submitted_at: datetime


class VideoProgressResponse(BaseModel):
    project_video_id: str
    video_label: str
    annotations_expected: int
    annotations_submitted: int
    is_complete: bool
    annotators: list[AnnotatorProgressResponse] | None = None  # None until complete


class ProjectProgressResponse(BaseModel):
    total_videos: int
    total_annotations_expected: int
    total_annotations_submitted: int
    videos: list[VideoProgressResponse]


# Misc
class SignedUrlResponse(BaseModel):
    signed_url: str
    expiration: int

class HealthResponse(BaseModel):
    status: str
    database: str