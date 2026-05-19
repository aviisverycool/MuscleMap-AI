from dataclasses import dataclass
from typing import List, Optional, Any

@dataclass
class ChatRequest:
    session_id: str
    message: str
    history: Optional[List[Any]] = None

@dataclass
class ChatResponse:
    message: str

@dataclass
class TitleRequest:
    message: str

@dataclass
class TitleResponse:
    title: str