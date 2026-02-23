"""
Simple JSON-based storage for documents
Replaces SQLAlchemy for MVP
"""
import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

DATA_DIR = Path("./data")
DOCS_FILE = DATA_DIR / "documents.json"
CHUNKS_FILE = DATA_DIR / "chunks.json"
CHAT_FILE = DATA_DIR / "chat_history.json"

def ensure_data_dir():
    """Ensure data directory and files exist"""
    DATA_DIR.mkdir(exist_ok=True)
    for file in [DOCS_FILE, CHUNKS_FILE, CHAT_FILE]:
        if not file.exists():
            file.write_text("[]")

def load_json(file_path: Path) -> List[Dict]:
    """Load JSON file"""
    try:
        return json.loads(file_path.read_text())
    except:
        return []

def save_json(file_path: Path, data: List[Dict]):
    """Save JSON file"""
    file_path.write_text(json.dumps(data, indent=2, default=str))

class DocumentStore:
    """Simple document storage"""
    
    @staticmethod
    def create(filename: str, file_path: str, file_size: int, page_count: int) -> Dict:
        """Create a new document"""
        ensure_data_dir()
        docs = load_json(DOCS_FILE)
        
        doc = {
            "id": str(uuid.uuid4()),
            "filename": filename,
            "file_path": file_path,
            "upload_date": datetime.utcnow().isoformat(),
            "file_size": file_size,
            "page_count": page_count,
            "processing_status": "pending",
            "summary": None,
            "meta_data": {}
        }
        
        docs.append(doc)
        save_json(DOCS_FILE, docs)
        return doc
    
    @staticmethod
    def get_all() -> List[Dict]:
        """Get all documents"""
        ensure_data_dir()
        return load_json(DOCS_FILE)
    
    @staticmethod
    def get_by_id(doc_id: str) -> Optional[Dict]:
        """Get document by ID"""
        docs = DocumentStore.get_all()
        for doc in docs:
            if doc["id"] == doc_id:
                return doc
        return None
    
    @staticmethod
    def update(doc_id: str, updates: Dict):
        """Update document"""
        docs = DocumentStore.get_all()
        for i, doc in enumerate(docs):
            if doc["id"] == doc_id:
                docs[i].update(updates)
                save_json(DOCS_FILE, docs)
                return docs[i]
        return None

class ChunkStore:
    """Simple chunk storage"""
    
    @staticmethod
    def create_many(doc_id: str, chunks: List[str]):
        """Create multiple chunks"""
        ensure_data_dir()
        all_chunks = load_json(CHUNKS_FILE)
        
        new_chunks = []
        for i, content in enumerate(chunks):
            chunk = {
                "id": str(uuid.uuid4()),
                "document_id": doc_id,
                "content": content,
                "chunk_index": i,
                "section_title": None
            }
            new_chunks.append(chunk)
        
        all_chunks.extend(new_chunks)
        save_json(CHUNKS_FILE, all_chunks)
        return new_chunks
    
    @staticmethod
    def get_by_document(doc_id: str) -> List[Dict]:
        """Get all chunks for a document"""
        all_chunks = load_json(CHUNKS_FILE)
        return [c for c in all_chunks if c["document_id"] == doc_id]
    
    @staticmethod
    def get_by_indices(doc_id: str, indices: List[int]) -> List[Dict]:
        """Get chunks by their indices"""
        all_chunks = ChunkStore.get_by_document(doc_id)
        return [c for c in all_chunks if c["chunk_index"] in indices]

class ChatStore:
    """Simple chat history storage"""
    
    @staticmethod
    def create(doc_id: str, question: str, answer: str, context_chunks: List[str]):
        """Create chat entry"""
        ensure_data_dir()
        history = load_json(CHAT_FILE)
        
        entry = {
            "id": str(uuid.uuid4()),
            "document_id": doc_id,
            "question": question,
            "answer": answer,
            "context_chunks": context_chunks,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        history.append(entry)
        save_json(CHAT_FILE, history)
        return entry
    
    @staticmethod
    def get_by_document(doc_id: str) -> List[Dict]:
        """Get chat history for document"""
        history = load_json(CHAT_FILE)
        return [h for h in history if h["document_id"] == doc_id]
