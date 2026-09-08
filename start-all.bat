@echo off
chcp 65001 >nul
title Integrated System + Universal Server

echo ==========================================
echo   Iniciando Sistema Completo...
echo ==========================================
echo.

cd /d "%~dp0"

echo Configurando PATH...
set "PATH=C:\Users\Victor\AppData\Local\nvm\v24.14.1;%PATH%"

echo Verificando Node.js...
node --version
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado
    pause
    exit /b 1
)

echo Verificando npm...
npm --version
if errorlevel 1 (
    echo ERRO: npm nao encontrado
    pause
    exit /b 1
)

echo Verificando pnpm...
pnpm --version
if errorlevel 1 (
    echo pnpm nao encontrado. Instalando...
    npm install -g pnpm
    if errorlevel 1 (
        echo ERRO: Falha ao instalar pnpm
        pause
        exit /b 1
    )
    echo pnpm instalado.
    pnpm --version
)

echo.
echo ==========================================
echo   Iniciando Universal Server API...
echo ==========================================
echo.

start "Universal Server - API" cmd /c "cd /d "%~dp0universal-server" && set PORT=8080 && set NODE_ENV=development && set DASHBOARD_PASSWORD=admin123 && set UNIVERSAL_SERVER_LOCAL_MODE=true && npx tsx ./artifacts/api-server/src/index.ts"

timeout /t 5 /nobreak >nul

echo.
echo ==========================================
echo   Iniciando Universal Server Dashboard...
echo ==========================================
echo.

start "Universal Server - Dashboard" cmd /c "cd /d "%~dp0universal-server" && set PORT=23183 && set BASE_PATH=/ && pnpm --filter @workspace/dashboard run dev"

timeout /t 8 /nobreak >nul

echo.
echo ==========================================
echo   Iniciando Integrated System...
echo ==========================================
echo.

set HOST=0.0.0.0
set PORT=5000

npx tsx server/index.ts

echo.
echo Servidor encerrado.
pause
