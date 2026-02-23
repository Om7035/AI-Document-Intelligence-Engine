# AI Document Intelligence Engine — CHANGELOG

> **Last updated**: 2026-02-23  
> **Status legend**: ✅ Done · 🔄 In Progress · ❌ Not Started · ⚠️ Partial/Broken

---

## PART 1 — BACKEND (FastAPI + Python)

### Phase 1: Core Infrastructure ✅ Done
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | FastAPI app skeleton (`main.py`, `routes.py`) | ✅ | CORS, startup event |
| 1.2 | Config management (`core/config.py`, `.env`) | ✅ | pydantic-settings, all vars |
| 1.3 | All `__init__.py` files added to packages | ✅ | core, db, models, schemas, services, api/endpoints |
| 1.4 | JSON-based document store (`db/json_store.py`) | ✅ | Replaced SQLAlchemy (was blocking on import) |
| 1.5 | Basic PDF text extraction (`services/pdf_processor.py`) | ✅ | PyMuPDF (`fitz`) |
| 1.6 | Word-level chunking (sliding window) | ✅ | 500-word chunks, 50-word overlap |
| 1.7 | FAISS vector store with lazy imports | ✅ | faiss + sentence_transformers lazy-loaded |
| 1.8 | Ollama LLM service (summary + mindmap + chat) | ✅ | llama3.1, lazy client |
| 1.9 | Document upload endpoint (`POST /api/documents/upload/`) | ✅ | File saved + background task triggered |
| 1.10 | Document list/detail endpoints (`GET /api/documents/`) | ✅ | |
| 1.11 | Mindmap endpoint (`GET /api/documents/{id}/mindmap/`) | ✅ | |
| 1.12 | Chat/RAG endpoint (`POST /api/chat/`) | ✅ | Streaming response |
| 1.13 | Health endpoint (`GET /health`) | ✅ | |

### Phase 2: Backend Quality (🔄 Starting Now)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Improved PDF processor — heading extraction, page tracking | 🔄 | Font-size heuristic for headings |
| 2.2 | Better chunking — paragraph-aware, not word-split | ❌ | Use regex sentence splitting (no spaCy dependency) |
| 2.3 | FAISS chunk-ID mapping file persisted to disk | ❌ | So restart doesn't break retrieval |
| 2.4 | LLM summary — robust prompt, graceful fallback | ❌ | Handle Ollama down scenarios |
| 2.5 | LLM mindmap — validate Markdown output format | ❌ | Ensure # hierarchy correct |
| 2.6 | Document delete endpoint (`DELETE /api/documents/{id}/`) | ❌ | Remove JSON entry + FAISS index + file |
| 2.7 | Document summary endpoint (`GET /api/documents/{id}/summary/`) | ❌ | Return summary field |
| 2.8 | Proper error handling throughout | ❌ | HTTP exceptions with meaningful messages |
| 2.9 | Backend startup: verify Ollama reachable | ❌ | Health check on startup |

---

## PART 2 — FRONTEND (Next.js 16 + TypeScript)

### Phase 3: Core Frontend ✅ Done
| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | Next.js 16 App Router setup | ✅ | TypeScript, Tailwind v4 |
| 3.2 | Global CSS — glassmorphism dark theme | ✅ | Custom scrollbar, glass-panel |
| 3.3 | Zustand state store (`store/useStore.ts`) | ✅ | documents, currentDocumentId |
| 3.4 | API client (`lib/api.ts`) | ✅ | Axios + fetch for streaming |
| 3.5 | `Sidebar` component — document list, status badges | ✅ | 5s polling |
| 3.6 | `DocumentUploader` — drag-drop, file input | ✅ | Framer Motion animations |
| 3.7 | `ChatInterface` — message list, streaming reader | ✅ | SSE chunk parsing |
| 3.8 | `MindmapViewer` — Markmap.js render | ✅ | Fetches from backend |
| 3.9 | `page.tsx` main layout — tabs (Chat/Mindmap) | ✅ | Split 2-col on LG |
| 3.10 | Shared UI components (`ui/index.tsx`) — Button, Input, Card | ✅ | |

### Phase 4: Frontend Completion (🔄 Starting Now)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | `SummaryPanel` component — collapsible, copyable | ❌ | Show doc.summary |
| 4.2 | Add Summary tab to page.tsx tab switcher | ❌ | 3 tabs: Chat / Mindmap / Summary |
| 4.3 | Fix chat stream parsing — raw text not SSE format | ❌ | Backend yields raw, not `data:` prefixed |
| 4.4 | Toast notification system | ❌ | Upload success, errors |
| 4.5 | Sidebar: document delete button | ❌ | With confirm |
| 4.6 | Sidebar: "New Document" triggers uploader | ❌ | Scroll or modal |
| 4.7 | Loading skeleton for mindmap/summary | ❌ | Pulse animation while doc processing |
| 4.8 | Document info panel — page count, size, status | ❌ | On selecting a doc |
| 4.9 | Chat: clear conversation button | ❌ | |
| 4.10 | Store: add `currentDocument` (full object, not just ID) | ❌ | Needed by SummaryPanel |
| 4.11 | Export mindmap button (SVG download) | ❌ | |
| 4.12 | Upload status auto-redirect to doc after complete | ❌ | Set currentDocumentId after upload |

---

## PART 3 — INTEGRATION & RELIABILITY

### Phase 5: End-to-End Integration (🔄 Starting Now)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | Verify backend starts without blocking | ✅ | All imports lazy |
| 5.2 | Test upload → background process → status poll | ❌ | Manual check needed |
| 5.3 | Test FAISS search returns correct chunks | ❌ | |
| 5.4 | Test chat returns grounded answers | ❌ | |
| 5.5 | Test mindmap renders from real LLM output | ❌ | |
| 5.6 | Fix PyMuPDF import (may need lazy too) | ❌ | `import fitz` might block |

---

## PART 4 — README & DOCS

### Phase 6: Documentation (❌ Not Started)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | `README.md` — Setup, run, usage | ❌ | |
| 6.2 | Architecture diagram (ASCII) in README | ❌ | |
| 6.3 | `run_all.bat` improvements — wait for Ollama | ❌ | |
| 6.4 | `backend/README.md` — API docs | ❌ | |

---

## BUILD ORDER (What We're Doing Next)

```
[NOW]  → PART 2 Phase 4: Frontend Completion
         2.1 SummaryPanel component
         4.3 Fix chat stream parsing
         4.4 Toast system
         4.5 Delete documents
         4.10 Store improvements
         4.12 Auto-redirect after upload

[THEN] → PART 1 Phase 2: Backend Quality
         2.2 Better chunking
         2.3 FAISS chunk mapping
         2.6 Delete endpoint
         2.7 Summary endpoint

[THEN] → PART 4: README + run scripts

[LAST] → Integration testing + polish
```

---

## SESSION LOG

### Session 1 (Setup)
- Initialized FastAPI backend structure
- Created Next.js 16 frontend
- Set up SQLite + SQLAlchemy (later removed due to blocking import)
- Created all service files

### Session 2 (Debugging)
- Fixed Tailwind v4 CSS syntax
- Added trailing slashes to API calls
- Fixed hydration warnings
- Added `__init__.py` files
- Implemented lazy loading for SentenceTransformer
- Discovered FAISS also blocks on import — made lazy too
- **SQLAlchemy engine creation was blocking** → Replaced with JSON file store
- Backend now starts correctly

### Session 3 (This Session — 2026-02-23)
- Uploaded code to GitHub: https://github.com/Om7035/AI-Document-Intelligence-Engine
- Created this CHANGELOG
- **Starting**: Frontend completion + Backend quality improvements
