"""
Chat endpoint — RAG pipeline with streaming.
Retrieves top-k chunks from FAISS, builds prompt, streams LLM response.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.db.json_store import DocumentStore, ChunkStore, ChatStore
from app.services.vector_store import VectorStore
from app.services.llm_service import LLMService
from pydantic import BaseModel
from typing import List, Dict, Generator

router = APIRouter()
vector_store = VectorStore()
llm_service = LLMService()

SYSTEM_PROMPT = """You are a helpful AI assistant specialising in document analysis.
Answer the user's question using ONLY the provided document context.
If the answer is not in the context, say "I couldn't find that in the document."
Be concise, accurate, and cite relevant parts where possible."""


class ChatRequest(BaseModel):
    document_id: str
    question: str
    history: List[Dict[str, str]] = []


def stream_with_save(generator: Generator, doc_id: str, question: str, context_chunks: List[str]):
    """Wrap the LLM generator to collect the full answer and save to history."""
    full_answer = ""
    for token in generator:
        full_answer += token
        yield token
    # Persist after streaming completes
    try:
        ChatStore.create(doc_id, question, full_answer, context_chunks)
    except Exception as e:
        print(f"Chat save error: {e}")


@router.post("/")
async def chat_with_document(request: ChatRequest):
    """RAG: retrieve relevant chunks → build prompt → stream LLM answer."""
    doc = DocumentStore.get_by_id(request.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc["processing_status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Document still processing (status: {doc['processing_status']}). Please wait."
        )

    # 1. Embed query and retrieve top-k matching chunks
    _, chunk_indices = vector_store.search(doc["id"], request.question, k=5)

    # 2. Fetch chunk text
    relevant_chunks: List[str] = []
    if chunk_indices:
        chunks = ChunkStore.get_by_indices(doc["id"], chunk_indices)
        # Sort by chunk_index for coherent reading order
        chunks.sort(key=lambda c: c["chunk_index"])
        relevant_chunks = [c["content"] for c in chunks]

    context = "\n\n---\n\n".join(relevant_chunks) if relevant_chunks else "No relevant context found."

    # 3. Build message list (with optional multi-turn history)
    messages: List[Dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]
    # Add up to 4 previous turns for context
    for turn in request.history[-4:]:
        if turn.get("role") in ("user", "assistant") and turn.get("content"):
            messages.append(turn)

    messages.append({
        "role": "user",
        "content": f"Document context:\n{context}\n\nQuestion: {request.question}"
    })

    # 4. Stream response
    generator = llm_service.chat(messages)
    return StreamingResponse(
        stream_with_save(generator, doc["id"], request.question, relevant_chunks),
        media_type="text/plain",
        headers={"X-Accel-Buffering": "no"},  # disable nginx buffering if applicable
    )


@router.get("/history/{doc_id}/")
def get_chat_history(doc_id: str):
    """Get past chat exchanges for a document."""
    doc = DocumentStore.get_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return ChatStore.get_by_document(doc_id)
