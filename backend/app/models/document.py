import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Document(Base):
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String)
    file_path = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    file_size = Column(Integer)
    page_count = Column(Integer, nullable=True)
    processing_status = Column(String, default="pending") 
    summary = Column(Text, nullable=True)
    meta_data = Column(JSON, nullable=True)

class Chunk(Base):
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("document.id"))
    content = Column(Text)
    chunk_index = Column(Integer)
    section_title = Column(String, nullable=True)

class ChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("document.id"))
    question = Column(Text)
    answer = Column(Text)
    context_chunks = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)
