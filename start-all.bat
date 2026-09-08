@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

title IntegrateSystem - Start All

rem ============================================================
rem INTEGRATESYSTEM - LAUNCHER WINDOWS ROBUSTO
rem Executa tudo nesta mesma janela para nunca esconder erros.
rem ============================================================

echo ============================================================
echo IntegrateSystem - inicializacao local
echo Pasta: %CD%
echo ============================================================
echo.

set "APP_DIR=%~dp0"
set "NODE_CMD="
set "NPM_CMD="

rem 1. Node disponivel diretamente no PATH
node.exe --version >nul 2>&1
if not errorlevel 1 (
  set "NODE_CMD=node.exe"
  call :find_npm_from_path
)

rem 2. NVM for Windows via NVM_SYMLINK
if not defined NODE_CMD if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" (
  set "NODE_CMD=%NVM_SYMLINK%\node.exe"
  if exist "%NVM_SYMLINK%\npm.cmd" set "NPM_CMD=%NVM_SYMLINK%\npm.cmd"
)

rem 3. NVM for Windows instalacao comum
if not defined NODE_CMD if exist "C:\nvm4w\nodejs\node.exe" (
  set "NODE_CMD=C:\nvm4w\nodejs\node.exe"
  if exist "C:\nvm4w\nodejs\npm.cmd" set "NPM_CMD=C:\nvm4w\nodejs\npm.cmd"
)

rem 4. Instalacoes convencionais
if not defined NODE_CMD if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE_CMD=%ProgramFiles%\nodejs\node.exe"
  if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
)

if not defined NODE_CMD if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
  set "NODE_CMD=%ProgramFiles(x86)%\nodejs\node.exe"
  if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"
)

if not defined NODE_CMD if exist "%LocalAppData%\Programs\nodejs\node.exe" (
  set "NODE_CMD=%LocalAppData%\Programs\nodejs\node.exe"
  if exist "%LocalAppData%\Programs\nodejs\npm.cmd" set "NPM_CMD=%LocalAppData%\Programs\nodejs\npm.cmd"
)

if not defined NODE_CMD (
  echo [ERRO] Node.js nao foi encontrado nesta maquina.
  echo.
  echo Instale Node.js 20.x LTS ou NVM for Windows.
  echo O launcher procurou PATH, NVM e instalacoes comuns.
  echo.
  pause
  exit /b 1
)

if not defined NPM_CMD call :find_npm_near_node

if not defined NPM_CMD (
  echo [ERRO] npm.cmd nao foi encontrado junto do Node.js.
  echo Node detectado em: %NODE_CMD%
  echo.
  pause
  exit /b 1
)

for %%I in ("%NODE_CMD%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%APP_DIR%;%PATH%"

echo [INFO] Node detectado em: %NODE_CMD%
"%NODE_CMD%" --version
if errorlevel 1 goto :fatal

echo [INFO] npm detectado em: %NPM_CMD%
"%NPM_CMD%" --version
if errorlevel 1 goto :fatal

echo.

for /f "tokens=1 delims=." %%A in ('"%NODE_CMD%" --version') do set "NODE_MAJOR=%%A"
set "NODE_MAJOR=!NODE_MAJOR:v=!"
if not "!NODE_MAJOR!"=="20" (
  echo [AVISO] O projeto declara Node.js 20.x.
  echo [AVISO] Versao ativa: !NODE_MAJOR!
  echo [AVISO] Continuando para diagnostico. Node 20 LTS e recomendado.
  echo.
)

if not exist "package.json" (
  echo [ERRO] package.json nao foi encontrado.
  echo A pasta atual nao parece ser o IntegrateSystem.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] node_modules nao existe.
  echo [INFO] Instalando dependencias com npm.cmd...
  echo.
  call "%NPM_CMD%" install
  if errorlevel 1 (
    echo.
    echo [ERRO] npm install falhou.
    goto :fatal
  )
  echo.
)

echo ============================================================
echo [INFO] Iniciando servidor IntegrateSystem
 echo [INFO] Comando: npm run dev
 echo [INFO] Porta esperada: 5000
 echo ============================================================
echo.

rem IMPORTANTE: nao usar START/CMD /K.
rem O npm roda nesta mesma janela, portanto nenhum erro desaparece.
call "%NPM_CMD%" run dev
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo ============================================================
if "%EXIT_CODE%"=="0" (
  echo [OK] O servidor terminou normalmente.
) else (
  echo [ERRO] O servidor terminou com codigo %EXIT_CODE%.
)
echo ============================================================
echo.
echo A janela permanecera aberta para leitura do log.
pause
exit /b %EXIT_CODE%

:find_npm_from_path
for %%I in (npm.cmd) do if exist "%%~$PATH:I" set "NPM_CMD=%%~$PATH:I"
exit /b 0

:find_npm_near_node
if not defined NODE_CMD exit /b 1
for %%I in ("%NODE_CMD%") do set "NODE_DIR=%%~dpI"
if exist "%NODE_DIR%npm.cmd" set "NPM_CMD=%NODE_DIR%npm.cmd"
exit /b 0

:fatal
echo.
echo [ERRO] A inicializacao nao pode continuar.
echo.
pause
exit /b 1
