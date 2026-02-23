@echo off
echo Starting AI Document Intelligence Engine...

echo Starting Ollama...
start /B ollama serve

echo Starting Backend...
cd backend
call venv\Scripts\activate
start "Backend" cmd /k "uvicorn app.main:app --reload"

echo Starting Frontend...
cd ..\frontend
start "Frontend" cmd /k "npm run dev"

echo All services started!
pause
