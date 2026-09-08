@echo off
chcp 65001 >nul
title Integrated System - Servidor Universal
echo ==========================================
echo   Integrated System - Servidor Universal
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

echo Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
    if errorlevel 1 (
        echo ERRO: Falha ao instalar dependencias
        pause
        exit /b 1
    )
)

echo Configurando firewall...
netsh advfirewall firewall add rule name="Integrated System HTTP" dir=in action=allow protocol=TCP localport=5000 >nul 2>&1

echo Obtendo IP da rede...
set "IP="
for /f "delims=" %%a in ('powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*' | Where-Object { $_.IPAddress -notlike '127.*' }).IPAddress" 2^>nul') do set "IP=%%a"
if "%IP%"=="" (
    for /f "delims=" %%a in ('powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Ethernet*' | Where-Object { $_.IPAddress -notlike '127.*' }).IPAddress" 2^>nul') do set "IP=%%a"
)
if "%IP%"=="" (
    for /f "delims=" %%a in ('powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' }).IPAddress" 2^>nul') do set "IP=%%a"
)
if "%IP%"=="" set "IP=SEU_IP_AQUI"

echo.
echo ==========================================
echo   Servidor iniciado!
echo ==========================================
echo.
echo  Local: http://localhost:5000
echo  Rede:  http://%IP%:5000
echo.
echo  Pressione CTRL+C para parar.
echo ==========================================
echo.

set HOST=0.0.0.0
set PORT=5000

npx tsx server/index.ts

echo.
echo Servidor encerrado.
pause
