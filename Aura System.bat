@echo off
cd /d "%~dp0"
title Aura System

echo.
echo ============================================================
echo Aura System - Electron
echo ============================================================
echo.

echo [INFO] Iniciando servidor e Electron...
echo.

node electron/bootstrap.js

echo.
echo ============================================================
echo Aura System finalizado.
echo ============================================================
pause