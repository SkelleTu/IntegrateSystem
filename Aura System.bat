@echo off
cd /d "%~dp0"
title Aura System

rem Google Drive para backups do banco local
set "AURA_GOOGLE_DRIVE_BACKUP_DIR=G:\Meu Drive\Aura System - Backups\Banco de Dados\sqlite"

echo.
echo ============================================================
echo Aura System - Producao
echo ============================================================
echo.
echo [INFO] Preparando build de producao...
npm run build
if errorlevel 1 (
  echo.
  echo [ERRO] Falha no build. O Aura System nao sera iniciado.
  pause
  exit /b 1
)
echo [INFO] Build de producao concluido.
echo [INFO] Iniciando servidor e Electron...
echo [INFO] Backup automatico do SQLite: ATIVO
echo [INFO] Destino: %AURA_GOOGLE_DRIVE_BACKUP_DIR%
echo.

rem Inicia servidor em janela separada (minimizada)
start "Aura Server" /min cmd /c "node dist/index.js"

rem Aguarda servidor subir
timeout /t 3 /nobreak >nul

rem Inicia Electron em janela principal
start "Aura Electron" cmd /c "npx electron electron/main.js"

echo.
echo ============================================================
echo Aura System iniciado (servidor + Electron em janelas separadas)
echo ============================================================
echo.
echo Pressione qualquer tecla para encerrar TUDO...
pause

rem Mata processos ao fechar
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM electron.exe /T >nul 2>&1