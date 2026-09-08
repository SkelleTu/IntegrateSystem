@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title IntegrateSystem - Start All

set "APP_DIR=%~dp0"
set "NODE_CMD="
set "NPM_CMD="
set "NVM_CMD="

call :banner
call :find_nvm
call :find_node
if not defined NODE_CMD goto :no_node

call :select_supported_node
call :find_node
if not defined NODE_CMD goto :no_node

for %%I in ("%NODE_CMD%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%APP_DIR%;%PATH%"

call :find_npm
if not defined NPM_CMD (
  echo [ERRO] npm.cmd nao foi encontrado junto do Node.js.
  echo Node: %NODE_CMD%
  echo Diretorio: %NODE_DIR%
  goto :fatal
)

echo [INFO] Node: %NODE_CMD%
"%NODE_CMD%" --version || goto :fatal
echo [INFO] npm:  %NPM_CMD%
"%NPM_CMD%" --version || goto :fatal
echo.

for /f "tokens=1 delims=." %%A in ('"%NODE_CMD%" --version') do set "NODE_MAJOR=%%A"
set "NODE_MAJOR=!NODE_MAJOR:v=!"
if not "!NODE_MAJOR!"=="20" (
  echo [ERRO] Este projeto exige Node.js 20.x.
  echo [ERRO] Versao encontrada: !NODE_MAJOR!
  echo.
  echo Instale Node.js 20 LTS ou instale a versao 20 pelo NVM for Windows.
  goto :fatal
)

if not exist "package.json" (
  echo [ERRO] package.json nao foi encontrado.
  goto :fatal
)

if not exist "node_modules" (
  echo [INFO] Primeira execucao: instalando dependencias...
  echo [INFO] Isso pode demorar alguns minutos.
  call "%NPM_CMD%" ci
  if errorlevel 1 (
    echo [AVISO] npm ci falhou. Tentando npm install...
    call "%NPM_CMD%" install
  )
  if errorlevel 1 (
    echo [ERRO] Nao foi possivel instalar as dependencias.
    goto :fatal
  )
)

if not exist "node_modules\.bin\tsx.cmd" (
  echo [ERRO] A dependencia tsx nao esta instalada corretamente.
  echo [INFO] Execute novamente para tentar reparar as dependencias.
  echo.
  call "%NPM_CMD%" install
  if errorlevel 1 goto :fatal
)

if not exist "sqlite.db" echo [INFO] sqlite.db nao existe. O aplicativo tentara cria-lo automaticamente.

echo.
echo ============================================================
echo [INFO] Preflight concluido
 echo [INFO] Node 20.x confirmado
 echo [INFO] npm operacional
 echo [INFO] Dependencias presentes
 echo [INFO] Iniciando servidor em http://localhost:5000
 echo ============================================================
echo.

call "%NPM_CMD%" run dev
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo ============================================================
if "%EXIT_CODE%"=="0" (
  echo [OK] Servidor finalizado normalmente.
) else (
  echo [ERRO] Servidor finalizado com codigo %EXIT_CODE%.
)
echo ============================================================
echo.
echo O log acima e o erro real do aplicativo, se houver.
pause
exit /b %EXIT_CODE%

:find_nvm
if defined NVM_HOME if exist "%NVM_HOME%\nvm.exe" set "NVM_CMD=%NVM_HOME%\nvm.exe"
if not defined NVM_CMD if exist "C:\nvm4w\nvm.exe" set "NVM_CMD=C:\nvm4w\nvm.exe"
exit /b 0

:select_supported_node
if not defined NVM_CMD exit /b 0
for /f "tokens=1,2 delims=.v" %%A in ('"%NODE_CMD%" --version 2^>nul') do set "CURRENT_MAJOR=%%A"
if "!CURRENT_MAJOR!"=="20" exit /b 0

echo [INFO] Node 20.x e necessario. Verificando NVM for Windows...
"%NVM_CMD%" list 2>nul
"%NVM_CMD%" use 20 2>nul
if errorlevel 1 (
  echo [AVISO] NVM nao conseguiu ativar Node 20.
  echo [AVISO] O launcher nao instala software automaticamente.
  echo.
  exit /b 0
)
exit /b 0

:find_node
set "NODE_CMD="
for %%I in (node.exe) do if not "%%~$PATH:I"=="" set "NODE_CMD=%%~$PATH:I"
if not defined NODE_CMD if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" set "NODE_CMD=%NVM_SYMLINK%\node.exe"
if not defined NODE_CMD if exist "C:\nvm4w\nodejs\node.exe" set "NODE_CMD=C:\nvm4w\nodejs\node.exe"
if not defined NODE_CMD if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_CMD=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_CMD if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_CMD=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_CMD if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_CMD=%LocalAppData%\Programs\nodejs\node.exe"
if not defined NODE_CMD if defined NVM_HOME for /f "delims=" %%V in ('"%NVM_HOME%\nvm.exe" current 2^>nul') do if exist "%NVM_HOME%\v%%V\node.exe" set "NODE_CMD=%NVM_HOME%\v%%V\node.exe"
exit /b 0

:find_npm
set "NPM_CMD="
for %%I in (npm.cmd) do if not "%%~$PATH:I"=="" set "NPM_CMD=%%~$PATH:I"
if not defined NPM_CMD if exist "%NODE_DIR%npm.cmd" set "NPM_CMD=%NODE_DIR%npm.cmd"
exit /b 0

:banner
echo ============================================================
echo IntegrateSystem - inicializacao local
echo Pasta: %CD%
echo ============================================================
echo.
exit /b 0

:no_node
echo [ERRO] Node.js 20.x nao foi encontrado.
echo Instale Node.js 20 LTS ou use NVM for Windows com Node 20 instalado.
goto :fatal

:fatal
echo.
echo ============================================================
echo [ERRO] A inicializacao foi interrompida.
echo ============================================================
echo.
pause
exit /b 1
