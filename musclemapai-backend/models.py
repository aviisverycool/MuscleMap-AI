from pydantic import BaseModel
from typing import List, Optional, Any

class ChatRequest(BaseModel):
    session_id: str
    message: str
    body_part: Optional[str] = None
    history: Optional[List[Any]] = None

class ChatResponse(BaseModel):
    message: str

class TitleRequest(BaseModel):
    message: str

class TitleResponse(BaseModel):
    title: str
