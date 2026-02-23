import shutil
import os
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
    """Background task to process uploaded document"""
    try:
        # Update status
        DocumentStore.update(doc_id, {"processing_status": "extracting_text"})

        # 1. Extract Text
        text = pdf_processor.extract_text(file_path)
        
        # 2. Chunking
        DocumentStore.update(doc_id, {"processing_status": "chunking"})
        chunks = pdf_processor.chunk_text(text)
        
        # Save chunks
        ChunkStore.create_many(doc_id, chunks)

        # 3. Vector Indexing
        DocumentStore.update(doc_id, {"processing_status": "indexing"})
        vector_store.create_index(chunks, doc_id)

        # 4. Generate Summary & Mindmap
        DocumentStore.update(doc_id, {"processing_status": "generating_summary"})
        full_text = " ".join(chunks)[:10000]  # Limit context
        summary = llm_service.generate_summary(full_text)
        
        # Generate Mindmap
        mindmap = llm_service.generate_mindmap(full_text)
        
        # Update document
        DocumentStore.update(doc_id, {
            "processing_status": "completed",
            "summary": summary,
            "meta_data": {"mindmap_content": mindmap}
        })
        
        print(f"✓ Document {doc_id} processed successfully")

    except Exception as e:
        print(f"✗ Error processing document {doc_id}: {e}")
        DocumentStore.update(doc_id, {"processing_status": "failed"})

@router.post("/upload/")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """Upload a PDF document"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    # Save file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get basic stats
    file_size = os.path.getsize(file_path)
    page_count = pdf_processor.get_page_count(file_path)

    # Create document entry
    doc = DocumentStore.create(
        filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        page_count=page_count
    )

    # Start background processing
    background_tasks.add_task(process_document_background, doc["id"], file_path)

    return doc

@router.get("/")
def list_documents():
    """List all documents"""
    return DocumentStore.get_all()

@router.get("/{doc_id}/")
def get_document(doc_id: str):
    """Get document by ID"""
    doc = DocumentStore.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.get("/{doc_id}/mindmap/")
def get_document_mindmap(doc_id: str):
    """Get document mindmap"""
    doc = DocumentStore.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Return mindmap content
    meta_data = doc.get("meta_data", {})
    content = meta_data.get("mindmap_content")
    
    if not content:
        return {"content": "# Processing...\nPlease wait."}
         
    return {"content": content}
