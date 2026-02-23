@echo off
title DocMatrix AI - Backend
cd /d "%~dp0backend"

echo.
echo ================================================================
echo  DocMatrix AI - Backend (FastAPI)
echo ================================================================

rem Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo [!] Virtual environment not found.
    echo     Run: python -m venv venv ^&^& pip install -r requirements.txt
    pause
    exit /b 1
)

echo [OK] Virtual env activated
echo [>>] Starting FastAPI on http://localhost:8000
echo [>>] API docs at   http://localhost:8000/docs
echo.

uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
