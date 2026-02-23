"""
SQLAlchemy document models — NOT USED in current implementation.
Storage is handled by app.db.json_store (JSON-based dicts).
Document schema for reference:
{
    "id": str (uuid4),
    "filename": str,
    "file_path": str,
    "upload_date": str (ISO 8601),
    "file_size": int,
    "page_count": int | null,
    "processing_status": "pending" | "extracting_text" | "chunking" | "indexing" | "generating_summary" | "completed" | "failed",
    "summary": str | null,
    "meta_data": {"mindmap_content": str} | {}
}
"""
