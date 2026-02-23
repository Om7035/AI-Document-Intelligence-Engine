# AI Document Intelligence Engine - Project Context

## 1. Project Goal

Build a **privacy-first, fully offline document intelligence system** that processes PDFs locally and provides:
- Interactive hierarchical mindmaps
- Multi-level summaries
- Semantic chat-over-document (RAG) capabilities

**Zero external API calls. Zero cloud dependencies. CPU-only compatible.**

---

## 2. What the System Does End-to-End

### User Journey:
1. **Upload PDF** → Drag-and-drop interface
2. **Processing** → Extract text, chunk semantically, generate embeddings
3. **Visualization** → View interactive mindmap of document structure
4. **Summarization** → Read hierarchical summaries (executive → section → chunk)
5. **Chat** → Ask questions, get answers grounded in document context

### Technical Flow:
```
PDF Upload
    ↓
Text Extraction (PyMuPDF)
    ↓
Semantic Segmentation (spaCy)
    ↓
Chunking (512 tokens, 50 overlap)
    ↓
Embedding Generation (Sentence Transformers)
    ↓
FAISS Indexing (persisted to disk)
    ↓
Mindmap Generation (LLM → Markdown → Markmap JSON)
    ↓
Summary Generation (LLM, chunk → section → document)
    ↓
Chat Interface (Query → FAISS → Context → LLM → Answer)
```

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Upload UI  │  │   Mindmap    │  │  Chat Panel  │      │
│  │  (Drag/Drop) │  │  (Markmap.js)│  │  (Streaming) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │                 │                 │              │
│           └─────────────────┴─────────────────┘              │
│                             │                                │
│                    HTTP/WebSocket                            │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PDF Processor│  │ Vector Store │  │  LLM Service │      │
│  │  (PyMuPDF)   │  │   (FAISS)    │  │   (Ollama)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────┴────────┐                        │
│                    │   SQLite DB    │                        │
│                    │  (Metadata)    │                        │
│                    └────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │  Local Ollama   │
                    │  (llama3.1)     │
                    └─────────────────┘
```

---

## 4. Analysis of Existing Code

### ✅ What Already Works:

#### Backend:
- **FastAPI app structure** (`app/main.py`) with CORS middleware
- **Database models** (`app/models/document.py`): Document, Chunk, ChatHistory
- **Pydantic schemas** (`app/schemas/document.py`): Request/Response models
- **PDF Processor** (`app/services/pdf_processor.py`): Text extraction, chunking
- **Vector Store** (`app/services/vector_store.py`): FAISS indexing, similarity search
- **LLM Service** (`app/services/llm_service.py`): Ollama integration for summaries, mindmaps, chat
- **Document endpoints** (`app/api/endpoints/documents.py`): Upload, list, get, mindmap
- **Chat endpoint** (`app/api/endpoints/chat.py`): Streaming RAG responses
- **Environment config** (`.env`, `app/core/config.py`): Settings management

#### Frontend:
- **Next.js 16 App Router** setup with TypeScript
- **Tailwind CSS v4** with glassmorphism design
- **UI Components** (`components/ui/index.tsx`): Card, Button, Input
- **DocumentUploader** (`components/DocumentUploader.tsx`): Drag-drop with progress
- **ChatInterface** (`components/ChatInterface.tsx`): Message list, streaming
- **MindmapViewer** (`components/MindmapViewer.tsx`): Markmap integration
- **Sidebar** (`components/Sidebar.tsx`): Document list, status tracking
- **API client** (`lib/api.ts`): Axios wrapper for backend calls
- **State management** (`store/useStore.ts`): Zustand store

### ⚠️ What is Partially Implemented:

1. **Backend Processing Pipeline**:
   - Background task for document processing exists
   - Summary and mindmap generation called but not tested
   - FAISS index creation works but retrieval mapping needs verification

2. **Frontend Data Flow**:
   - API calls configured with trailing slashes
   - Real-time polling for document status (5s interval)
   - Mindmap fetches from backend but rendering needs testing

3. **Chat Streaming**:
   - Backend streams via generator
   - Frontend attempts to parse stream but chunk parsing logic may be incomplete

### ❌ What is Broken or Missing:

#### Critical Issues:
1. **Backend Not Starting Properly**:
   - Server process starts but doesn't fully initialize
   - Worker process not spawning
   - Likely missing `__init__.py` files or import errors

2. **Database Initialization**:
   - Tables created on startup but no migration system
   - No seed data or test fixtures

3. **spaCy Model**:
   - `en_core_web_sm` download attempted but may not be complete
   - No fallback if model missing

4. **FAISS Index Persistence**:
   - Index saved to disk but no reload logic on server restart
   - Chunk ID → FAISS index mapping fragile (assumes order)

5. **LLM Prompts**:
   - Mindmap prompt exists but output format not validated
   - Summary prompt truncates at 8000 chars (arbitrary)
   - Chat prompt doesn't handle multi-turn context properly

6. **Frontend Error Handling**:
   - Network errors not gracefully handled
   - No retry logic
   - Loading states incomplete

7. **Missing Features**:
   - No document deletion
   - No chat history persistence
   - No export functionality (mindmap as SVG/PNG)
   - No summary display component

---

## 5. Design Decisions Taken So Far

1. **Local-First Architecture**: All processing on-device, no cloud dependencies
2. **Ollama for LLM**: Using llama3.1 via HTTP API (localhost:11434)
3. **FAISS for Vector Search**: CPU-compatible, fast, persistent
4. **SQLite for Metadata**: Lightweight, file-based, no server needed
5. **Background Processing**: FastAPI BackgroundTasks for async document processing
6. **Streaming Responses**: Server-Sent Events for chat (better UX)
7. **Glassmorphism UI**: Modern, premium aesthetic with dark theme
8. **Markmap for Visualization**: Mature library for interactive mindmaps

---

## 6. Missing Components Required for Full Functionality

### Backend:
1. **Fix Server Initialization**:
   - Add missing `__init__.py` files
   - Fix import paths
   - Ensure worker process spawns

2. **Improve Chunking Strategy**:
   - Use spaCy sentence boundaries
   - Maintain section hierarchy
   - Add metadata (page numbers, headings)

3. **Robust FAISS Mapping**:
   - Store chunk IDs in FAISS metadata
   - Use proper ID-to-content mapping

4. **LLM Prompt Engineering**:
   - Validate mindmap Markdown output
   - Add structured output parsing
   - Handle long documents (map-reduce)

5. **Error Handling**:
   - Graceful degradation if Ollama down
   - Retry logic for LLM calls
   - Validation for PDF corruption

### Frontend:
1. **Summary Display Component**:
   - Hierarchical collapsible view
   - Metadata display (reading time, word count)

2. **Error Boundaries**:
   - Catch and display API errors
   - Retry mechanisms

3. **Loading States**:
   - Skeleton loaders
   - Progress indicators for all async operations

4. **Chat Improvements**:
   - Fix streaming chunk parsing
   - Add source highlighting
   - Show retrieved chunks

5. **Export Features**:
   - Mindmap → SVG/PNG
   - Summary → PDF
   - Chat history → Markdown

### Testing:
1. **Backend Unit Tests**:
   - PDF extraction accuracy
   - Chunking consistency
   - FAISS search relevance
   - LLM response validation

2. **Integration Tests**:
   - Full upload → process → retrieve flow
   - Chat with context accuracy

3. **Manual Testing Checklist**:
   - Upload various PDF types
   - Verify mindmap structure
   - Test chat with different queries

---

## 7. Exact Plan to Complete the Project Safely

### Phase 1: Fix Critical Backend Issues (Priority 1)
**Goal**: Get backend fully operational

1. **Add Missing Init Files**:
   ```bash
   touch app/core/__init__.py
   touch app/db/__init__.py
   touch app/models/__init__.py
   touch app/schemas/__init__.py
   touch app/services/__init__.py
   touch app/api/endpoints/__init__.py
   ```

2. **Fix Import Paths**:
   - Verify all imports use absolute paths (`from app.X import Y`)
   - Check for circular dependencies

3. **Test Server Startup**:
   ```bash
   cd backend
   source venv/bin/activate  # or .\venv\Scripts\activate on Windows
   uvicorn app.main:app --reload
   ```
   - Verify worker spawns
   - Check `/health` endpoint
   - Test `/docs` (FastAPI auto-docs)

4. **Verify Database**:
   - Check `data/documents.db` created
   - Inspect tables with SQLite browser
   - Add sample document manually to test queries

### Phase 2: Complete Backend Processing Pipeline (Priority 2)
**Goal**: End-to-end document processing works

1. **Improve PDF Processor**:
   - Add page number tracking
   - Extract headings (font size heuristic)
   - Handle multi-column layouts

2. **Enhance Chunking**:
   - Use spaCy for sentence segmentation
   - Respect paragraph boundaries
   - Add section metadata

3. **Fix FAISS Mapping**:
   - Store `chunk_id` in FAISS index metadata
   - Update search to return chunk IDs
   - Fetch chunks from DB by ID (not index)

4. **Test LLM Integration**:
   - Verify Ollama is running (`ollama list`)
   - Test summary generation with sample text
   - Test mindmap generation, validate Markdown output
   - Add fallback if LLM fails

### Phase 3: Frontend Completion (Priority 3)
**Goal**: All UI components functional

1. **Fix API Connection**:
   - Verify CORS headers
   - Test all endpoints with Postman/curl
   - Fix trailing slash issues

2. **Complete Chat Interface**:
   - Fix streaming chunk parsing
   - Add "sources" display (show retrieved chunks)
   - Add follow-up question suggestions

3. **Add Summary Component**:
   ```tsx
   components/SummaryPanel.tsx
   ```
   - Collapsible sections
   - Metadata display
   - Copy-to-clipboard

4. **Improve Loading States**:
   - Add skeleton loaders
   - Progress bars for upload
   - Processing status badges

5. **Error Handling**:
   - Add error boundaries
   - Toast notifications for errors
   - Retry buttons

### Phase 4: Testing & Validation (Priority 4)
**Goal**: System is reliable and demo-ready

1. **Backend Tests**:
   ```python
   tests/test_pdf_processor.py
   tests/test_vector_store.py
   tests/test_llm_service.py
   ```

2. **Manual Testing**:
   - Upload 5 different PDFs (research papers, contracts, reports)
   - Verify mindmaps are accurate
   - Test chat with 10 questions per document
   - Check summaries are coherent

3. **Performance Testing**:
   - Test with large PDFs (50+ pages)
   - Measure processing time
   - Check memory usage

### Phase 5: Documentation & Polish (Priority 5)
**Goal**: Project is interview-ready

1. **README.md**:
   - System overview
   - Setup instructions
   - Usage guide
   - Limitations
   - Architecture diagram

2. **Code Cleanup**:
   - Remove debug prints
   - Add docstrings
   - Format with Black/Prettier

3. **Demo Script**:
   - Prepare sample PDFs
   - Create demo walkthrough
   - Record demo video (optional)

---

## Next Steps (Immediate Actions)

1. ✅ Create this context document
2. 🔄 Fix backend initialization (add `__init__.py` files)
3. 🔄 Test backend startup and endpoints
4. 🔄 Verify frontend can connect to backend
5. 🔄 Test full upload → process → view flow
6. 🔄 Complete missing components (summary panel, error handling)
7. 🔄 Write tests
8. 🔄 Create comprehensive README

---

**Status**: Backend partially running, frontend ready, integration incomplete.
**Blocker**: Backend worker not spawning, preventing document processing.
**Next Action**: Add missing `__init__.py` files and restart backend.
