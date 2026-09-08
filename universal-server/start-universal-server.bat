@echo off
chcp 65001 >nul
title Universal Server

echo ==========================================
echo   Universal Server
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

echo Verificando pnpm...
pnpm --version
if errorlevel 1 (
    echo ERRO: pnpm nao encontrado
    pause
    exit /b 1
)

echo Instalando dependencias...
pnpm install || pause

echo Configurando firewall...
netsh advfirewall firewall add rule name="Universal Server API" dir=in action=allow protocol=TCP localport=8080 >nul 2>&1
netsh advfirewall firewall add rule name="Universal Server Dashboard" dir=in action=allow protocol=TCP localport=23183 >nul 2>&1

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
echo   Iniciando servidores...
echo ==========================================
echo.
echo  API:        http://localhost:8080/api
echo  Dashboard:  http://localhost:23183
echo  Rede:       http://%IP%:23183
echo.
echo  Feche esta janela para parar.
echo ==========================================
echo.

echo Iniciando API Server...
start "Universal Server - API" cmd /c "cd /d "%~dp0" && set PORT=8080 && set NODE_ENV=development && set DASHBOARD_PASSWORD=admin123 && set UNIVERSAL_SERVER_LOCAL_MODE=true && npx tsx ./artifacts/api-server/src/index.ts || pause"

timeout /t 5 /nobreak >nul

echo Iniciando Dashboard...
start "Universal Server - Dashboard" cmd /c "cd /d "%~dp0" && set PORT=23183 && set BASE_PATH=/ && pnpm --filter @workspace/dashboard run dev || pause"

echo.
echo Servicos iniciados em janelas separadas.
echo Esta janela pode ser fechada.
echo.

pause
