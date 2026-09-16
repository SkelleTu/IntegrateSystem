@echo off
cd /d "%~dp0"
title Aura System

rem Google Drive para backups do banco local
set "AURA_GOOGLE_DRIVE_BACKUP_DIR=G:\Meu Drive\Aura System - Backups\Banco de Dados\sqlite"

echo.
echo ============================================================
echo Aura System - Electron
echo ============================================================
echo.
echo [INFO] Iniciando servidor e Electron...
echo [INFO] Backup automatico do SQLite: ATIVO
echo [INFO] Destino: %AURA_GOOGLE_DRIVE_BACKUP_DIR%
echo.

node electron/bootstrap.js
echo.
echo ============================================================
echo Aura System finalizado.
echo ============================================================
pause