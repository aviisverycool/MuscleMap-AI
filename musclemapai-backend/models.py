from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ChatRequest(StrictRequest):
    session_id: UUID
    message: str = Field(min_length=1, max_length=6000)
    body_part: Optional[str] = Field(default=None, max_length=80)


class ChatResponse(BaseModel):
    message: str

class TitleRequest(StrictRequest):
    message: str = Field(min_length=1, max_length=6000)


class TitleResponse(BaseModel):
    title: str
