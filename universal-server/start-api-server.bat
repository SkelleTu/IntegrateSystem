@echo off
chcp 65001 >nul
title Universal Server - API Server

echo ==========================================
echo   Universal Server - API Server
echo ==========================================
echo.

cd /d "%~dp0.."

echo Configurando PATH...
set "PATH=C:\Users\Victor\AppData\Local\nvm\v24.14.1;%PATH%"

echo Verificando Node.js...
node --version
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado
    pause
    exit /b 1
)

echo Verificando pnpm...
pnpm --version
if errorlevel 1 (
    echo ERRO: pnpm nao encontrado
    pause
    exit /b 1
)

echo Verificando tsx...
npx tsx --version
if errorlevel 1 (
    echo ERRO: tsx nao encontrado
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   Iniciando API Server...
echo ==========================================
echo.
echo  API: http://localhost:8080/api
echo.
echo  Pressione CTRL+C para parar.
echo ==========================================
echo.

set PORT=8080
set NODE_ENV=development
set DASHBOARD_PASSWORD=admin123
set UNIVERSAL_SERVER_LOCAL_MODE=true

npx tsx ./artifacts/api-server/src/index.ts

echo.
echo Servidor encerrado.
pause
