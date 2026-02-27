@echo off
title Aura System - Inicializador
echo ==========================================
echo    AURA SYSTEM - WINDOWS OFFLINE
echo ==========================================
echo.
cd /d "%~dp0"

:: Verifica se o Node.js está instalado
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js não encontrado! 
    echo Por favor, instale o Node.js para rodar o sistema.
    pause
    exit
)

:: Verifica dependências
if not exist node_modules (
    echo [INFO] Instalando dependencias pela primeira vez...
    call npm install --omit=dev
)

echo [INFO] Iniciando o sistema...
call npm start

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Ocorreu um problema ao iniciar o Aura System.
    pause
)
