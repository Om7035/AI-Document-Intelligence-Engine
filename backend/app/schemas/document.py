from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class DocumentBase(BaseModel):
    filename: str

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: str
    upload_date: datetime
    file_size: int
    processing_status: str
    page_count: Optional[int] = None
    summary: Optional[str] = None
    
    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    document_id: str
    question: str
    history: List[Dict[str, str]] = []

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
