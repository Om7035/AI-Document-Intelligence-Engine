@echo off
title DocMatrix AI - First-Time Setup
cd /d "%~dp0"

echo.
echo ================================================================
echo  DocMatrix AI - First-Time Setup
echo ================================================================
echo.

rem ── Check Python ────────────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.10+ from https://python.org
    pause
    exit /b 1
)
echo [OK] Python found

rem ── Check Node ──────────────────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found

rem ── Backend Setup ───────────────────────────────────────────────
echo.
echo [1/4] Setting up Python virtual environment...
cd backend
if not exist "venv" python -m venv venv
call venv\Scripts\activate

echo [2/4] Installing Python dependencies...
pip install -r requirements.txt --quiet

rem Create data directories
if not exist "data\uploads"       mkdir data\uploads
if not exist "data\faiss_indices" mkdir data\faiss_indices
echo [OK] Data directories created

deactivate
cd ..

rem ── Frontend Setup ──────────────────────────────────────────────
echo.
echo [3/4] Installing Node.js dependencies...
cd frontend
npm install --silent
cd ..

rem ── Ollama Check ────────────────────────────────────────────────
echo.
echo [4/4] Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Ollama is running
    echo      Pulling llama3.1 model if not already present...
    ollama pull llama3.1
) else (
    echo [!] Ollama not detected at http://localhost:11434
    echo     Install from https://ollama.ai, then run: ollama pull llama3.1
)

rem ── Done ────────────────────────────────────────────────────────
echo.
echo ================================================================
echo  Setup complete!
echo.
echo  To start the app, run:
echo    start_all.bat       (launches all services)
echo.
echo    OR separately:
echo    start_backend.bat   (FastAPI on port 8000)
echo    start_frontend.bat  (Next.js on port 3000)
echo ================================================================
echo.
pause
