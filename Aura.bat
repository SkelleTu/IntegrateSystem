@echo off
cd /d "%~dp0"
title Aura System

echo.
echo ============================================================
echo Aura System - Start
echo ============================================================
echo.

echo [INFO] Iniciando servidor em http://localhost:5005
echo [INFO] Abrindo app...
echo.

start /b "" npm run dev

timeout /t 3 /nobreak >nul

start "" msedge --app=http://localhost:5005

echo.
echo Servidor rodando.
echo Feche esta janela para parar.
pause
