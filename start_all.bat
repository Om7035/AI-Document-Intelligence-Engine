@echo off
title DocMatrix AI - Full Stack
cd /d "%~dp0"

echo.
echo ================================================================
echo  DocMatrix AI - Full Stack Launcher
echo ================================================================
echo.
echo  Starting:
echo    [1] Ollama           - http://localhost:11434
echo    [2] FastAPI Backend  - http://localhost:8000
echo    [3] Next.js Frontend - http://localhost:3000
echo.

rem Start Ollama in background (skip if already running)
echo [1] Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo     Starting Ollama...
    start "" cmd /c "ollama serve"
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Ollama already running
)

rem Start Backend in new window
echo [2] Starting backend...
start "DocMatrix Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

rem Wait a moment for backend to initialise
timeout /t 2 /nobreak >nul

rem Start Frontend in new window
echo [3] Starting frontend...
start "DocMatrix Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo [OK] All services launched in separate windows.
echo.
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8000/docs
echo    Ollama:   http://localhost:11434
echo.
pause
