import shutil
import os
import re
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from app.db.json_store import DocumentStore, ChunkStore
from app.services.pdf_processor import PDFProcessor
from app.services.vector_store import VectorStore
from app.services.llm_service import LLMService
from app.core.config import settings

router = APIRouter()
pdf_processor = PDFProcessor()
vector_store = VectorStore()
llm_service = LLMService()


def process_document_background(doc_id: str, file_path: str):
    """Full document processing pipeline — runs in background task."""
    try:
        # 1. Extract Text
        DocumentStore.update(doc_id, {"processing_status": "extracting_text"})
        text = pdf_processor.extract_text(file_path)

        # 2. Chunk
        DocumentStore.update(doc_id, {"processing_status": "chunking"})
        chunks = pdf_processor.chunk_text(text)
        if not chunks:
            raise ValueError("No text extracted from PDF")

        ChunkStore.create_many(doc_id, chunks)

        # 3. Embed + Index
        DocumentStore.update(doc_id, {"processing_status": "indexing"})
        vector_store.create_index(chunks, doc_id)

        # 4. LLM Summary
        DocumentStore.update(doc_id, {"processing_status": "generating_summary"})
        full_text = " ".join(chunks)[:12000]
        summary = llm_service.generate_summary(full_text)

        # 5. LLM Mindmap
        mindmap = llm_service.generate_mindmap(full_text)

        # 6. Done
        DocumentStore.update(doc_id, {
            "processing_status": "completed",
            "summary": summary,
            "meta_data": {"mindmap_content": mindmap},
        })
        print(f"✓ Document {doc_id} processed successfully ({len(chunks)} chunks)")

    except Exception as e:
        print(f"✗ Error processing document {doc_id}: {e}")
        DocumentStore.update(doc_id, {"processing_status": "failed"})


@router.post("/upload/")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Upload a PDF document. Processing starts immediately in background."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Check size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large (max {settings.MAX_FILE_SIZE // 1_000_000}MB)")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Sanitize filename
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename)
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as f:
        f.write(content)

    page_count = pdf_processor.get_page_count(file_path)
    doc = DocumentStore.create(
        filename=file.filename,
        file_path=file_path,
        file_size=len(content),
        page_count=page_count,
    )

    background_tasks.add_task(process_document_background, doc["id"], file_path)
    return doc


@router.get("/")
def list_documents():
    """List all uploaded documents."""
    return DocumentStore.get_all()


@router.get("/{doc_id}/")
def get_document(doc_id: str):
    doc = DocumentStore.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{doc_id}/mindmap/")
def get_document_mindmap(doc_id: str):
    doc = DocumentStore.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    content = (doc.get("meta_data") or {}).get("mindmap_content")
    if not content:
        status = doc.get("processing_status", "pending")
        return {"content": f"# {doc['filename']}\n- Status: {status}"}
    return {"content": content}


@router.get("/{doc_id}/summary/")
def get_document_summary(doc_id: str):
    doc = DocumentStore.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "summary": doc.get("summary") or "Summary not yet generated.",
        "processing_status": doc.get("processing_status"),
    }


@router.delete("/{doc_id}/")
def delete_document(doc_id: str):
    doc = DocumentStore.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete FAISS index
    try:
        vector_store.delete_index(doc_id)
    except Exception:
        pass

    # Delete uploaded file
    try:
        if os.path.exists(doc["file_path"]):
            os.remove(doc["file_path"])
    except Exception:
        pass

    # Remove from store
    DocumentStore.delete(doc_id)
    ChunkStore.delete_by_document(doc_id)
    return {"message": "Document deleted successfully"}


@router.post("/{doc_id}/reprocess/")
async def reprocess_document(doc_id: str, background_tasks: BackgroundTasks):
    """
    Re-run the full AI pipeline (chunking → indexing → summary → mindmap)
    on an already-uploaded document. Use this when a previous processing
    run failed (e.g. Ollama was out of memory / not running).
    """
    doc = DocumentStore.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = doc.get("file_path", "")
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=422,
            detail="Original file no longer on disk — please re-upload.",
        )

    # Reset status so the frontend shows progress again
    DocumentStore.update(doc_id, {
        "processing_status": "pending",
        "summary": None,
        "meta_data": {},
    })
    # Clear old chunks + FAISS index
    ChunkStore.delete_by_document(doc_id)
    try:
        vector_store.delete_index(doc_id)
    except Exception:
        pass

    background_tasks.add_task(process_document_background, doc_id, file_path)
    return {"message": "Reprocessing started", "doc_id": doc_id}

