# AI Document Intelligence Engine

> **Privacy-first, fully offline AI document processing.** Upload any PDF — get mindmaps, summaries, and a chat interface, all running 100% locally using Ollama + FAISS.

---

## Features

| Feature | Status |
|---|---|
| PDF text extraction | ✅ |
| Paragraph-aware chunking | ✅ |
| FAISS vector search (RAG) | ✅ |
| AI-generated executive summary | ✅ |
| Interactive mindmap (Markmap.js) | ✅ |
| Streaming chat (multi-turn) | ✅ |
| Document delete | ✅ |
| 100% offline — no API keys | ✅ |

---

## Prerequisites

| Tool | Purpose | Install |
|---|---|---|
| Python 3.10+ | Backend | [python.org](https://python.org) |
| Node.js 18+ | Frontend | [nodejs.org](https://nodejs.org) |
| [Ollama](https://ollama.ai) | Local LLM | `winget install Ollama.Ollama` |
| llama3.1 model | Summarise/Chat | `ollama pull llama3.1` |

---

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/Om7035/AI-Document-Intelligence-Engine.git
cd AI-Document-Intelligence-Engine
```

### 2. Start Ollama
```bash
ollama serve          # runs on http://localhost:11434
ollama pull llama3.1  # download model (one-time, ~4GB)
```

### 3. Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend starts at **http://localhost:8000**  
Interactive API docs: **http://localhost:8000/docs**

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend starts at **http://localhost:3000**

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser (Next.js)                │
│   Sidebar │ Upload │ Chat │ Mindmap │ Summary        │
└──────────────────────┬──────────────────────────────┘
                       │ REST / Streaming
┌──────────────────────▼──────────────────────────────┐
│                  FastAPI Backend                     │
│  POST /api/documents/upload/   → Background Task    │
│  GET  /api/documents/          → Document list      │
│  GET  /api/documents/{id}/mindmap/                  │
│  GET  /api/documents/{id}/summary/                  │
│  DEL  /api/documents/{id}/                          │
│  POST /api/chat/               → Streaming SSE      │
└───────────────────┬────────────────────┬────────────┘
                    │                    │
         ┌──────────▼───────┐   ┌────────▼─────────┐
         │  FAISS Index     │   │  Ollama LLM      │
         │  (sentence-      │   │  llama3.1        │
         │   transformers)  │   │  (local)         │
         └──────────────────┘   └──────────────────┘
                    │
         ┌──────────▼───────┐
         │  JSON Store      │
         │  data/documents  │
         │  data/chunks     │
         │  data/chat_hist  │
         └──────────────────┘
```

---

## Environment Variables

### Backend (`backend/.env`)
```env
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1
FAISS_INDEX_PATH=./data/faiss_indices
UPLOAD_DIR=./data/uploads
MAX_FILE_SIZE=52428800
BACKEND_CORS_ORIGINS=http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_MAX_UPLOAD_SIZE=52428800
```

---

## Project Structure

```
PDF/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/   # documents.py, chat.py
│   │   ├── core/config.py   # Settings
│   │   ├── db/json_store.py # Storage layer
│   │   └── services/
│   │       ├── pdf_processor.py   # PyMuPDF extraction
│   │       ├── vector_store.py    # FAISS
│   │       └── llm_service.py     # Ollama
│   └── requirements.txt
├── frontend/
│   ├── app/page.tsx         # Main layout (3 tabs)
│   ├── components/
│   │   ├── ChatInterface.tsx
│   │   ├── MindmapViewer.tsx
│   │   ├── SummaryPanel.tsx
│   │   ├── DocumentUploader.tsx
│   │   ├── Sidebar.tsx
│   │   └── ToastContainer.tsx
│   ├── store/useStore.ts    # Zustand state
│   └── lib/api.ts           # API client
├── CHANGELOG.md
└── README.md
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Backend won't start | Check Python 3.10+, activate `venv`, run `pip install -r requirements.txt` |
| Chat says "LLM Error" | Run `ollama serve` and `ollama pull llama3.1` |
| Mindmap blank | Wait for document to reach "Ready" status |
| Upload fails | Ensure backend is on port 8000; check CORS |
| FAISS import error | `pip install faiss-cpu` |

---

## Tech Stack

**Backend**: FastAPI · PyMuPDF · sentence-transformers · FAISS · Ollama  
**Frontend**: Next.js 16 · TypeScript · Tailwind CSS v4 · Zustand · Framer Motion · Markmap.js · D3.js
