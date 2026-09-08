@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title IntegrateSystem - Start All

set "APP_DIR=%~dp0"
set "NODE_CMD="
set "NPM_CMD="

call :banner
call :find_node
if not defined NODE_CMD (
  echo.
  echo [ERRO] Node.js nao foi encontrado nesta maquina.
  echo.
  echo O launcher tentou PATH, NVM for Windows e instalacoes comuns.
  echo Para executar o IntegrateSystem, instale Node.js 20.x LTS.
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
set "PATH=%NODE_DIR%;%APP_DIR%;%PATH%"

call :show_versions
call :check_node_major
call :check_dependencies
if errorlevel 1 exit /b 1

call :start_server
exit /b %ERRORLEVEL%

:banner
echo ============================================================
echo IntegrateSystem - inicializacao local
echo Pasta: %APP_DIR%
echo ============================================================
echo.
exit /b 0

:find_node
rem 1) PATH atual, usando executaveis diretamente e sem 'where'.
node.exe --version >nul 2>&1
if not errorlevel 1 (
  set "NODE_CMD=node.exe"
  if exist "%~dp0..
pm.cmd" set "NPM_CMD=%~dp0..\npm.cmd"
  call :find_npm_near_node
  if defined NPM_CMD exit /b 0
)

rem 2) NVM for Windows: usa NVM_SYMLINK quando disponivel.
if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" (
  set "NODE_CMD=%NVM_SYMLINK%\node.exe"
  if exist "%NVM_SYMLINK%\npm.cmd" set "NPM_CMD=%NVM_SYMLINK%\npm.cmd"
  if defined NPM_CMD exit /b 0
)

rem 3) Caminho comum do NVM for Windows 4W e outras instalacoes.
for %%P in (
  "C:\nvm4w\nodejs"
  "%ProgramFiles%\nodejs"
  "%ProgramFiles(x86)%\nodejs"
  "%LocalAppData%\Programs\nodejs"
) do (
  if not defined NODE_CMD if exist "%%~P\node.exe" (
    set "NODE_CMD=%%~P\node.exe"
    if exist "%%~P\npm.cmd" set "NPM_CMD=%%~P\npm.cmd"
  )
)

rem 4) Tenta obter NVM_HOME e descobrir a versao ativa sem depender do PATH.
if not defined NODE_CMD if defined NVM_HOME if exist "%NVM_HOME%\nvm.exe" (
  for /f "delims=" %%V in ('"%NVM_HOME%\nvm.exe" current 2^>nul') do set "NVM_CURRENT=%%V"
  if defined NVM_CURRENT if not "!NVM_CURRENT!"=="none" if exist "%NVM_HOME%\v!NVM_CURRENT!\node.exe" (
    set "NODE_CMD=%NVM_HOME%\v!NVM_CURRENT!\node.exe"
    if exist "%NVM_HOME%\v!NVM_CURRENT!\npm.cmd" set "NPM_CMD=%NVM_HOME%\v!NVM_CURRENT!\npm.cmd"
  )
)

if defined NODE_CMD if not defined NPM_CMD call :find_npm_near_node
exit /b 0

:find_npm_near_node
if not defined NODE_CMD exit /b 1
for %%I in ("%NODE_CMD%") do set "NODE_DIR=%%~dpI"
if exist "!NODE_DIR!npm.cmd" set "NPM_CMD=!NODE_DIR!npm.cmd"
if exist "!NODE_DIR!node_modules\npm\bin\npm-cli.js" if not defined NPM_CMD set "NPM_CMD=!NODE_DIR!npm.cmd"
exit /b 0

:show_versions
echo [INFO] Node detectado em:
echo        %NODE_CMD%
"%NODE_CMD%" --version
if errorlevel 1 (
  echo [ERRO] Node.js foi localizado, mas nao pode ser executado.
  pause
  exit /b 1
)
echo [INFO] npm detectado em:
echo        %NPM_CMD%
"%NPM_CMD%" --version
if errorlevel 1 (
  echo [ERRO] npm foi localizado, mas nao pode ser executado.
  pause
  exit /b 1
)
echo.
exit /b 0

:check_node_major
for /f "tokens=1 delims=." %%A in ('"%NODE_CMD%" --version') do set "NODE_MAJOR=%%A"
set "NODE_MAJOR=!NODE_MAJOR:v=!"
if not "!NODE_MAJOR!"=="20" (
  echo [AVISO] O projeto declara Node.js 20.x.
  echo [AVISO] Versao ativa detectada: !NODE_MAJOR!
  echo [AVISO] O launcher continuara, mas Node 20 LTS e recomendado.
  echo.
)
exit /b 0

:check_dependencies
if exist "node_modules" exit /b 0

echo [INFO] node_modules nao existe. Instalando dependencias...
echo [INFO] Isso pode demorar na primeira execucao.
echo.
call "%NPM_CMD%" install
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao instalar as dependencias.
  echo [ERRO] O processo foi interrompido para preservar o diagnostico.
  echo.
  pause
  exit /b 1
)

echo.
echo [OK] Dependencias instaladas.
echo.
exit /b 0

:start_server
echo [INFO] Iniciando IntegrateSystem...
echo [INFO] Servidor esperado em http://localhost:5000
echo [INFO] A janela do servidor permanecera aberta para mostrar erros reais.
echo.

start "IntegrateSystem - Server" cmd /k "cd /d ""%APP_DIR%"" && call ""%NPM_CMD%"" run dev"
if errorlevel 1 (
  echo [ERRO] O Windows nao conseguiu criar a janela do servidor.
  pause
  exit /b 1
)

echo [OK] Processo do servidor iniciado.
echo.
pause
exit /b 0
