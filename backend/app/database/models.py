from database.db import Base
from sqlalchemy import Column, String, TIMESTAMP
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
    name = Column(String, nullable=False)
