import re
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator
from typing import Self
from app.core.config import settings


# ---------- Enums ----------

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
    ACTIVE = "Active"
    COMPLETE = "Complete"


# ---------- Nested Schemas ----------

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


# ---------- Auth Schemas ----------

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


# ---------- Video Schemas ----------

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


# ---------- Annotation Schemas ----------

class AnnotationCreateRequest(BaseModel):
    video_id: str
    segments: list[SegmentSchema] = []


class AnnotationUpdateRequest(BaseModel):
    segments: list[SegmentSchema] = []


class AnnotationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    video_id: str
    user_id: str
    segments: list[SegmentSchema]


# ---------- User Response Schemas ----------

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str | None = None
    role: str


# ---------- Misc Response Schemas ----------

class SignedUrlResponse(BaseModel):
    signed_url: str
    expiration: int