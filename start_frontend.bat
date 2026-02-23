@echo off
title DocMatrix AI - Frontend
cd /d "%~dp0frontend"

echo.
echo ================================================================
echo  DocMatrix AI - Frontend (Next.js)
echo ================================================================

if not exist "node_modules" (
    echo [>>] Installing dependencies...
    npm install
)

echo [OK] Dependencies ready
echo [>>] Starting Next.js on http://localhost:3000
echo.

npm run dev
