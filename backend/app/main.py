"""
AI Document Intelligence Engine — FastAPI Backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router
from app.db.json_store import ensure_data_dir
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Privacy-first local AI document processing engine",
)

# ── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    ensure_data_dir()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.FAISS_INDEX_PATH, exist_ok=True)
    print(f"✓ {settings.PROJECT_NAME} v{settings.PROJECT_VERSION} started")
    print(f"  Upload dir : {settings.UPLOAD_DIR}")
    print(f"  FAISS dir  : {settings.FAISS_INDEX_PATH}")
    print(f"  Ollama     : {settings.OLLAMA_HOST} → model: {settings.OLLAMA_MODEL}")

# ── Routes ───────────────────────────────────────────────────────────────────
app.include_router(router, prefix=settings.API_V1_STR)

# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "version": settings.PROJECT_VERSION}

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "docs": "/docs",
    }
