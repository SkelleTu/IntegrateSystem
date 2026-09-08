@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

title IntegrateSystem - Start All

echo ============================================================
echo IntegrateSystem - inicializacao local
echo Pasta: %CD%
echo ============================================================
echo.

rem ============================================================
rem Detecta Node.js mesmo quando instalado pelo NVM for Windows.
rem Nao usamos 'where', porque o PATH desta maquina nao o resolve.
rem ============================================================
set "NODE_CMD="
set "NPM_CMD="

if exist "%NVM_SYMLINK%\node.exe" (
  set "NODE_CMD=%NVM_SYMLINK%\node.exe"
  if exist "%NVM_SYMLINK%\npm.cmd" set "NPM_CMD=%NVM_SYMLINK%\npm.cmd"
)

if not defined NODE_CMD if exist "C:\nvm4w\nodejs\node.exe" (
  set "NODE_CMD=C:\nvm4w\nodejs\node.exe"
  if exist "C:\nvm4w\nodejs\npm.cmd" set "NPM_CMD=C:\nvm4w\nodejs\npm.cmd"
)

if not defined NODE_CMD if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE_CMD=%ProgramFiles%\nodejs\node.exe"
  if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
)

if not defined NODE_CMD if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
  set "NODE_CMD=%ProgramFiles(x86)%\nodejs\node.exe"
  if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"
)

if not defined NODE_CMD (
  echo [ERRO] Node.js nao foi encontrado.
  echo.
  echo Procurado em:
  echo   - NVM_SYMLINK
  echo   - C:\nvm4w\nodejs
  echo   - Program Files\nodejs
  echo.
  pause
  exit /b 1
)

if not defined NPM_CMD (
  echo [ERRO] npm.cmd nao foi encontrado junto do Node.js.
  echo Node detectado em: %NODE_CMD%
  echo.
  pause
  exit /b 1
)

for %%I in ("%NODE_CMD%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"

echo [INFO] Node detectado em:
echo %NODE_CMD%
echo [INFO] Node:
"%NODE_CMD%" --version

echo [INFO] npm:
"%NPM_CMD%" --version

echo.

rem O projeto declara Node 20.x. Nao bloqueamos o inicio se outra versao
rem estiver ativa, mas deixamos um aviso visivel para diagnostico.
for /f "tokens=1,2 delims=.v" %%A in ('"%NODE_CMD%" --version') do set "NODE_MAJOR=%%A"
if defined NODE_MAJOR if not "!NODE_MAJOR!"=="20" (
  echo [AVISO] Este projeto declara Node.js 20.x, mas a versao ativa nao e 20.x.
  echo [AVISO] Versao atual: !NODE_MAJOR!
  echo [AVISO] O inicio continuara para permitir diagnostico e compatibilidade.
  echo.
)

if not exist "node_modules" (
  echo [INFO] node_modules nao existe. Instalando dependencias...
  call "%NPM_CMD%" install
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

start "IntegrateSystem - Server" cmd /k "cd /d "%~dp0" && call "%NPM_CMD%" run dev"

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
echo Este launcher nao depende de npm.ps1 nem do comando where.
echo.
pause
exit /b 0
