@echo off
cd /d "%~dp0"
title Aura System

echo.
echo ============================================================
echo Aura System - Producao
echo ============================================================
echo.

echo [INFO] Build de producao...
npm run build
if errorlevel 1 (
  echo [ERRO] Falha no build.
  pause
  exit /b 1
)

echo [INFO] Iniciando servidor na porta 5010...
start "Aura Server" cmd /c "node dist/index.js"

echo [INFO] Aguardando servidor subir...
timeout /t 4 /nobreak >nul

echo [INFO] Iniciando Electron...
npx electron electron/main.js

echo.
echo [INFO] Electron fechado. Encerrando servidor...
taskkill /F /IM node.exe /T >nul 2>&1
echo [INFO] Finalizado.
pause