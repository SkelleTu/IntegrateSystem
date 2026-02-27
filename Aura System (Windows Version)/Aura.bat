@echo off
title Aura System
echo Starting Aura System...
cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies (this may take a while)...
    npm install
)
npm start
if %errorlevel% neq 0 (
    echo.
    echo Error starting Aura System.
    pause
)
