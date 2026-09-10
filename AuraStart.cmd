@echo off
cd /d "%~dp0"
title Aura System

echo.
echo ============================================================
echo Aura System - Start
echo ============================================================
echo.

echo [INFO] Iniciando servidor em http://localhost:5005
echo [INFO] Abrindo browser...
echo.

start http://localhost:5005

echo [INFO] Servidor rodando. Nao feche esta janela.
echo [INFO] Para parar, pressione Ctrl+C.
echo.

npm run dev

echo.
echo ============================================================
echo Servidor parado.
echo ============================================================
pause
