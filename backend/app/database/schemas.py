import re

from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator
from pydantic.alias_generators import to_camel
from typing import Optional, Self

from app.core.config import settings
from app.core.enums import VideoStatusEnum


class BaseRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

class BaseResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

# Behavior
class Behavior(BaseModel):
    name: str
    hotkey: str
    description: Optional[str] = None
    threshold: Optional[int] = None


# Segment
class SegmentSchema(BaseRequest):
    behavior: Behavior
    start_time: float
    end_time: Optional[float] = None
    notes: Optional[str] = None

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


# User
class UserResponse(BaseResponse):
    id: str
    email: str
    name: Optional[str] = None
    role: str

# Video
class VideoResponse(BaseResponse):
    id: str
    src: str
    label: str
    description: Optional[str] = None
    link_count: int = 0
    created_at: Optional[datetime] = None


# Annotation
class AnnotationRequest(BaseRequest):
    segments: list[SegmentSchema] = []

class AnnotationResponse(BaseResponse):
    id: str
    assignment_id: str
    segments: list[SegmentSchema]
    submitted: bool = False
    submitted_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Assignment
class UpdateAssignmentRequest(BaseRequest):
    status: VideoStatusEnum = VideoStatusEnum.NOT_STARTED

class AssignmentResponse(BaseResponse):
    id: str
    project_video_id: str
    user_id: str
    created_at: Optional[datetime] = None
    status: VideoStatusEnum = VideoStatusEnum.NOT_STARTED

class AssignmentSummaryResponse(BaseResponse):
    id: str
    project_name: str
    user_name: str
    video_label: str
    created_at: Optional[datetime] = None
    status: VideoStatusEnum = VideoStatusEnum.NOT_STARTED


# ProjectMember
class ProjectMemberRequest(BaseRequest):
    user_id: str

class ProjectMemberResponse(BaseResponse):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    user_id: str
    user: UserResponse
    created_at: Optional[datetime] = None


# ProjectVideo
class ProjectVideoRequest(BaseRequest):
    video_id: str

class ProjectVideoResponse(BaseResponse):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    video_id: str
    video: VideoResponse
    created_at: Optional[datetime] = None


# Project
class ProjectRequest(BaseRequest):
    name: str
    description: Optional[str] = None
    behaviors: Optional[list[Behavior]] = None
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
    description: Optional[str] = None
    annotators_per_video: int
    behaviors: Optional[list[Behavior]] = None
    project_members: list[ProjectMemberResponse] = []
    project_videos: list[ProjectVideoResponse] = []
    created_at: Optional[datetime] = None


# Reporting
class FlaggedBehavior(BaseResponse):
    behavior_name: str
    threshold: int
    counts: list[int]
    difference: int


class AssignmentReport(BaseResponse):
    assignment_id: str
    user_id: str
    user_name: str
    status: str
    updated_at: Optional[datetime] = None
    segment_counts: dict[str, int]


class ProjectVideoReport(BaseResponse):
    video_id: str
    video_label: str
    assignments: list[AssignmentReport]
    flags: list[FlaggedBehavior]


# Misc
class SignedUrlResponse(BaseResponse):
    signed_url: str
    expiration: int

class HealthResponse(BaseResponse):
    status: str
    database: str