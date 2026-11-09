@echo off
title LoanFlow frontend
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo Install failed. Make sure Node.js is installed.
    pause
    exit /b 1
  )
)

echo.
echo Starting LoanFlow at http://localhost:5173
echo Press Ctrl+C to stop the server.
echo.

call npm.cmd run dev -- --open
pause
