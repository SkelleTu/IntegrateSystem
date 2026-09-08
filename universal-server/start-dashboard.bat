@echo off
chcp 65001 >nul
title Universal Server - Dashboard

echo ==========================================
echo   Universal Server - Dashboard
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

echo Configurando firewall...
netsh advfirewall firewall add rule name="Universal Server Dashboard" dir=in action=allow protocol=TCP localport=23183 >nul 2>&1

echo.
echo ==========================================
echo   Iniciando Dashboard...
echo ==========================================
echo.
echo  Dashboard: http://localhost:23183
echo.
echo  Pressione CTRL+C para parar.
echo ==========================================
echo.

set PORT=23183
set BASE_PATH=/

pnpm --filter @workspace/dashboard run dev

echo.
echo Servidor encerrado.
pause
