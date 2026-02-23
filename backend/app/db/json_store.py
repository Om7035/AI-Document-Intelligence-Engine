"""
JSON-based document store — replaces SQLAlchemy for lightweight MVP.
Supports full CRUD with delete operations.
"""
import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path
import threading

DATA_DIR = Path("./data")
DOCS_FILE = DATA_DIR / "documents.json"
CHUNKS_FILE = DATA_DIR / "chunks.json"
CHAT_FILE = DATA_DIR / "chat_history.json"

# Thread lock for concurrent background tasks
_lock = threading.Lock()


def ensure_data_dir():
    """Ensure data directory and JSON files exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for file in [DOCS_FILE, CHUNKS_FILE, CHAT_FILE]:
        if not file.exists():
            file.write_text("[]")


def load_json(file_path: Path) -> List[Dict]:
    try:
        text = file_path.read_text(encoding="utf-8")
        return json.loads(text) if text.strip() else []
    except Exception:
        return []


def save_json(file_path: Path, data: List[Dict]):
    file_path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")


class DocumentStore:
    """Thread-safe document storage backed by JSON."""

    @staticmethod
    def create(filename: str, file_path: str, file_size: int, page_count: int) -> Dict:
        ensure_data_dir()
        with _lock:
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
                "meta_data": {},
            }
            docs.insert(0, doc)  # newest first
            save_json(DOCS_FILE, docs)
        return doc

    @staticmethod
    def get_all() -> List[Dict]:
        ensure_data_dir()
        return load_json(DOCS_FILE)

    @staticmethod
    def get_by_id(doc_id: str) -> Optional[Dict]:
        for doc in DocumentStore.get_all():
            if doc["id"] == doc_id:
                return doc
        return None

    @staticmethod
    def update(doc_id: str, updates: Dict) -> Optional[Dict]:
        with _lock:
            docs = load_json(DOCS_FILE)
            for i, doc in enumerate(docs):
                if doc["id"] == doc_id:
                    docs[i].update(updates)
                    save_json(DOCS_FILE, docs)
                    return docs[i]
        return None

    @staticmethod
    def delete(doc_id: str) -> bool:
        with _lock:
            docs = load_json(DOCS_FILE)
            new_docs = [d for d in docs if d["id"] != doc_id]
            if len(new_docs) == len(docs):
                return False
            save_json(DOCS_FILE, new_docs)
        return True


class ChunkStore:
    """Chunk storage backed by JSON."""

    @staticmethod
    def create_many(doc_id: str, chunks: List[str]) -> List[Dict]:
        ensure_data_dir()
        with _lock:
            all_chunks = load_json(CHUNKS_FILE)
            new_chunks = [
                {
                    "id": str(uuid.uuid4()),
                    "document_id": doc_id,
                    "content": content,
                    "chunk_index": i,
                }
                for i, content in enumerate(chunks)
            ]
            all_chunks.extend(new_chunks)
            save_json(CHUNKS_FILE, all_chunks)
        return new_chunks

    @staticmethod
    def get_by_document(doc_id: str) -> List[Dict]:
        all_chunks = load_json(CHUNKS_FILE)
        return [c for c in all_chunks if c["document_id"] == doc_id]

    @staticmethod
    def get_by_indices(doc_id: str, indices: List[int]) -> List[Dict]:
        index_set = set(indices)
        return [
            c for c in ChunkStore.get_by_document(doc_id)
            if c["chunk_index"] in index_set
        ]

    @staticmethod
    def delete_by_document(doc_id: str):
        with _lock:
            all_chunks = load_json(CHUNKS_FILE)
            filtered = [c for c in all_chunks if c["document_id"] != doc_id]
            save_json(CHUNKS_FILE, filtered)


class ChatStore:
    """Chat history storage."""

    @staticmethod
    def create(doc_id: str, question: str, answer: str, context_chunks: List[str]) -> Dict:
        ensure_data_dir()
        with _lock:
            history = load_json(CHAT_FILE)
            entry = {
                "id": str(uuid.uuid4()),
                "document_id": doc_id,
                "question": question,
                "answer": answer,
                "context_chunks": context_chunks,
                "timestamp": datetime.utcnow().isoformat(),
            }
            history.append(entry)
            save_json(CHAT_FILE, history)
        return entry

    @staticmethod
    def get_by_document(doc_id: str) -> List[Dict]:
        return [h for h in load_json(CHAT_FILE) if h["document_id"] == doc_id]

    @staticmethod
    def delete_by_document(doc_id: str):
        with _lock:
            history = load_json(CHAT_FILE)
            filtered = [h for h in history if h["document_id"] != doc_id]
            save_json(CHAT_FILE, filtered)
