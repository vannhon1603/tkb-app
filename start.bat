@echo off
echo ===================================================
echo     KHOI DONG DU AN TKB (FRONTEND + BACKEND)
echo ===================================================

:: Start Backend in a new window
echo [1/2] Dang khoi dong Backend FastAPI (Port 8000)...
start "TKB Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --port 8000"

:: Start Frontend in current / new window
echo [2/2] Dang khoi dong Frontend Next.js (Port 3000)...
cd /d %~dp0frontend
npm run dev
