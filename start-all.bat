@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title IntegrateSystem - Start All

echo ============================================================
echo IntegrateSystem - inicializacao local
echo Pasta: %CD%
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado no PATH.
  echo Instale Node.js 20.x e tente novamente.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERRO] npm nao foi encontrado no PATH.
  echo Verifique a instalacao do Node.js 20.x.
  echo.
  pause
  exit /b 1
)

echo [INFO] Node:
node --version
echo [INFO] npm:
npm.cmd --version
echo.

if not exist "node_modules" (
  echo [INFO] node_modules nao existe. Instalando dependencias...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar as dependencias.
    echo.
    pause
    exit /b 1
  )
  echo.
)

echo [INFO] Iniciando servidor IntegrateSystem na porta 5000...
echo [INFO] A janela do servidor permanecera aberta para mostrar erros reais.
echo.

start "IntegrateSystem - Server" cmd /k "cd /d "%~dp0" && call npm.cmd run dev"

if errorlevel 1 (
  echo.
  echo [ERRO] Nao foi possivel abrir o processo do servidor.
  echo.
  pause
  exit /b 1
)

timeout /t 2 /nobreak >nul

echo [OK] Processo de inicializacao enviado.
echo [INFO] Aplicacao esperada em: http://localhost:5000

echo.
echo Este launcher nao fecha silenciosamente: erros ficam visiveis na janela do servidor.
echo.
pause
exit /b 0
