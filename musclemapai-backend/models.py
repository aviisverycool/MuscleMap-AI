from pydantic import BaseModel
from typing import List, Optional, Any

class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: Optional[List[Any]] = None

class ChatResponse(BaseModel):
    message: str