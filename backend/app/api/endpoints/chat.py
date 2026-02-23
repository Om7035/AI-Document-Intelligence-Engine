from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.db.json_store import DocumentStore, ChunkStore
from app.services.vector_store import VectorStore
from app.services.llm_service import LLMService
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()
vector_store = VectorStore()
llm_service = LLMService()

class ChatRequest(BaseModel):
    document_id: str
    question: str
    history: List[Dict[str, str]] = []

@router.post("/")
async def chat_with_document(request: ChatRequest):
    """Chat with a document using RAG"""
    doc = DocumentStore.get_by_id(request.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc["processing_status"] != "completed":
        raise HTTPException(status_code=400, detail="Document not yet processed")

    # 1. Retrieve relevant chunks using FAISS
    distances, indices = vector_store.search(doc["id"], request.question)
    
    # 2. Get chunk contents
    relevant_chunks = []
    valid_indices = [int(idx) for idx in indices if idx != -1]
    
    if valid_indices:
        chunks = ChunkStore.get_by_indices(doc["id"], valid_indices)
        relevant_chunks = [c["content"] for c in chunks]

    context = "\n\n".join(relevant_chunks)
    
    # 3. Construct prompt for LLM
    system_prompt = "You are a helpful assistant. Use the following context to answer the user's question. If the answer is not in the context, say you don't know."
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {request.question}"}
    ]
    
    # 4. Stream response
    return StreamingResponse(
        llm_service.chat(messages),
        media_type="text/event-stream"
    )
