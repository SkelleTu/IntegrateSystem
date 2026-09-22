@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Aura System - Inicializacao

set "ROOT=%~dp0"
set "NODE_EXE=node"
set "NPM_CMD=npm"

echo.
echo ============================================================
echo                 AURA SYSTEM - INICIALIZACAO
echo ============================================================
echo.

call :progress 0 "Iniciando verificacoes"

echo [1/6] Verificando ambiente...
if not exist "%ProgramFiles%\nodejs\node.exe" (
  node --version >nul 2>&1
  if errorlevel 1 (
    echo [INFO] Node.js nao encontrado. Tentando instalar automaticamente...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-Command winget -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
    if errorlevel 1 (
      echo.
      echo [ERRO] Node.js nao esta instalado e o winget nao esta disponivel.
      echo Instale o Node.js LTS e execute novamente.
      pause
      exit /b 1
    )
    winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-source-agreements --accept-package-agreements
    if errorlevel 1 (
      echo.
      echo [ERRO] Falha ao instalar o Node.js automaticamente.
      pause
      exit /b 1
    )
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
  )
)

if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
  set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
)

"%NODE_EXE%" --version
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao pode ser executado.
  pause
  exit /b 1
)

"%NPM_CMD%" --version
if errorlevel 1 (
  echo.
  echo [ERRO] npm nao pode ser executado.
  pause
  exit /b 1
)

echo [OK] Ambiente pronto.
call :progress 10 "Ambiente verificado"
echo.

echo [2/6] Verificando dependencias...
if not exist "%ROOT%node_modules\.bin\tsx.cmd" goto :install_deps
if not exist "%ROOT%node_modules\.bin\electron-builder.cmd" goto :install_deps
echo [OK] Dependencias ja instaladas. Pulando instalacao.
call :progress 30 "Dependencias ja existentes"
goto :deps_done

:install_deps
echo [INFO] Primeira execucao ou dependencias incompletas.
if exist "%ROOT%package-lock.json" (
  echo [INFO] Instalando dependencias com npm ci...
  call "%NPM_CMD%" ci --no-audit --no-fund
) else (
  echo [INFO] package-lock.json nao encontrado. Usando npm install...
  call "%NPM_CMD%" install --no-audit --no-fund
)
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao instalar as dependencias.
  echo O erro original acima e necessario para diagnostico.
  pause
  exit /b 1
)
if not exist "%ROOT%node_modules\.bin\tsx.cmd" (
  echo.
  echo [ERRO] As dependencias foram instaladas, mas o tsx nao foi encontrado.
  pause
  exit /b 1
)
if not exist "%ROOT%node_modules\.bin\electron-builder.cmd" (
  echo.
  echo [ERRO] As dependencias foram instaladas, mas o electron-builder nao foi encontrado.
  pause
  exit /b 1
)
echo [OK] Dependencias instaladas.
call :progress 30 "Dependencias prontas"

:deps_done
echo.

echo [3/6] Verificando build de producao...
if exist "%ROOT%dist\index.js" if exist "%ROOT%dist\public\index.html" (
  echo [OK] Build existente encontrado. Reutilizando arquivos.
  call :progress 35 "Build existente detectado"
) else (
  echo [INFO] Build ausente ou incompleto. Gerando novamente...
  call :progress 35 "Preparando build"
  call "%ROOT%node_modules\.bin\tsx.cmd" script\build.ts
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha no build.
    echo O erro original acima e necessario para diagnostico.
    pause
    exit /b 1
  )
  if not exist "%ROOT%dist\index.js" (
    echo.
    echo [ERRO] Build terminou sem gerar dist\index.js!
    pause
    exit /b 1
  )
  if not exist "%ROOT%dist\public\index.html" (
    echo.
    echo [ERRO] Build terminou sem gerar dist\public\index.html!
    pause
    exit /b 1
  )
  echo [OK] Build concluido.
  call :progress 60 "Build concluido"
)
echo.

echo [4/6] Verificando pacote Electron...
if exist "%ROOT%dist\win-unpacked\Aura System.exe" (
  echo [OK] Electron ja empacotado. Reutilizando executavel existente.
  call :progress 65 "Electron existente detectado"
) else (
  echo [INFO] Executavel Electron ausente. Empacotando...
  call :progress 65 "Iniciando empacotamento Electron"
  call "%ROOT%node_modules\.bin\electron-builder.cmd" --config "%ROOT%electron-builder.config.json" --config.npmRebuild=false --config.asar=false
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha no empacotamento do Electron.
    echo O erro original acima e necessario para diagnostico.
    pause
    exit /b 1
  )
  if not exist "%ROOT%dist\win-unpacked\Aura System.exe" (
    echo.
    echo [ERRO] Empacotamento terminou sem gerar o executavel do Electron!
    pause
    exit /b 1
  )
  echo [OK] Electron embalado.
  call :progress 85 "Electron empacotado"
)
echo.

echo [5/6] Iniciando servidor local na porta 5010...
start "Aura Server" cmd /k "cd /d ""%ROOT%"" && ""%NODE_EXE%"" dist\index.js"
echo [OK] Servidor iniciado em janela separada.
call :progress 90 "Servidor iniciado"
echo.

echo [6/6] Aguardando servidor responder...
set "SERVER_READY=0"
for /L %%N in (1,1,30) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5010' -TimeoutSec 1; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    set "SERVER_READY=1"
    goto :server_ready
  )
  set /a "WAIT_PCT=90 + (%%N * 5 / 30)"
  call :progress !WAIT_PCT! "Aguardando servidor (%%N/30)"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1"
)

:server_ready
if "%SERVER_READY%"=="0" (
  echo.
  echo [ERRO] O servidor nao respondeu na porta 5010 apos 30 segundos.
  echo Verifique a janela "Aura Server" para ver o erro do Node.
  call :progress 95 "Servidor nao respondeu"
  pause
  taskkill /F /IM node.exe /T >nul 2>&1
  exit /b 1
)

echo [OK] Servidor respondeu na porta 5010.
call :progress 97 "Servidor pronto"
echo.

echo Iniciando Aura System...
call :progress 99 "Abrindo interface Electron"
"%ROOT%dist\win-unpacked\Aura System.exe"
set "ELECTRON_EXIT=%ERRORLEVEL%"

if not "%ELECTRON_EXIT%"=="0" (
  echo.
  echo [ERRO] O Electron foi encerrado com codigo %ELECTRON_EXIT%.
) else (
  call :progress 100 "Aura System finalizado"
)

echo.
echo [INFO] Electron finalizou com codigo de saida: %ELECTRON_EXIT%
echo [INFO] Encerrando servidor...
taskkill /F /IM node.exe /T >nul 2>&1

if not "%ELECTRON_EXIT%"=="0" (
  echo.
  echo A inicializacao terminou com erro.
  pause
  exit /b %ELECTRON_EXIT%
)

echo.
echo Inicializacao concluida com sucesso.
pause
exit /b 0

:progress
set "PCT=%~1"
set "PMSG=%~2"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=[int]'%PCT%'; $n=[math]::Floor($p/5); $bar=('=' * $n)+('.' * (20-$n)); Write-Host ('Progresso geral: ['+$bar+'] '+$p+'%%  '+('%PMSG%'))"
exit /b
