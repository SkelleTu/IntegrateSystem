@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Aura System - Inicializacao

set "ROOT=%~dp0"
set "NODE_EXE=node"
set "NPM_CMD=npm"
set "AURA_RUNTIME_DIR=%ROOT%runtime"
set "AURA_RUNTIME_HEARTBEAT_MS=250"

if not exist "%AURA_RUNTIME_DIR%" mkdir "%AURA_RUNTIME_DIR%" >nul 2>&1
if exist "%AURA_RUNTIME_DIR%\runtime-sync.stop" del /f /q "%AURA_RUNTIME_DIR%\runtime-sync.stop" >nul 2>&1
for /f "delims=" %%S in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "[guid]::NewGuid().ToString('N')"') do set "AURA_RUNTIME_SESSION=%%S"

call :runtime_event 0 "bootstrap" "Verificando acesso ao GitHub para runtime-live"

where git >nul 2>&1
if errorlevel 1 (
  echo [INFO] Git nao encontrado. Tentando instalar automaticamente...
  winget install --id Git.Git --exact --silent --accept-source-agreements --accept-package-agreements
  if errorlevel 1 (
    echo.
    echo [ERRO] Nao foi possivel instalar o Git automaticamente.
    call :runtime_event 0 "error" "Git ausente e instalacao automatica falhou"
    pause
    exit /b 1
  )
  set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
)

where gh >nul 2>&1
if errorlevel 1 (
  echo [INFO] GitHub CLI nao encontrado. Tentando instalar automaticamente...
  winget install --id GitHub.cli --exact --silent --accept-source-agreements --accept-package-agreements
  if errorlevel 1 (
    echo.
    echo [ERRO] Nao foi possivel instalar o GitHub CLI automaticamente.
    call :runtime_event 0 "error" "GitHub CLI ausente e instalacao automatica falhou"
    pause
    exit /b 1
  )
  set "PATH=%ProgramFiles%\GitHub CLI;%PATH%"
)

gh auth status --hostname github.com >nul 2>&1
if errorlevel 1 (
  echo.
  echo [INFO] GitHub ainda nao esta autenticado nesta maquina.
  echo [INFO] Abrindo a autenticacao oficial do GitHub no navegador...
  call :runtime_event 1 "github-auth" "Autenticacao GitHub necessaria; abrindo fluxo web"
  gh auth login --hostname github.com --web --git-protocol https --skip-ssh-key
  if errorlevel 1 (
    echo.
    echo [ERRO] A autenticacao do GitHub nao foi concluida.
    call :runtime_event 1 "error" "Autenticacao do GitHub nao concluida"
    pause
    exit /b 1
  )
)

gh auth setup-git --hostname github.com >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ERRO] Nao foi possivel configurar o Git para usar a autenticacao do GitHub CLI.
  call :runtime_event 2 "error" "gh auth setup-git falhou"
  pause
  exit /b 1
)

echo [OK] Git e GitHub prontos para sincronizacao.
call :runtime_event 3 "github-auth" "GitHub autenticado e Git configurado"

start "Aura Runtime Sync" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%tools\runtime-sync.ps1" -Root "%ROOT%" -SessionId "%AURA_RUNTIME_SESSION%" -IntervalMs 5000

call :runtime_event 0 "bootstrap" "Arquivo .bat aberto"

echo.
echo ============================================================
echo                 AURA SYSTEM - INICIALIZACAO
echo ============================================================
echo.

call :progress 0 "Iniciando verificacoes"
call :runtime_event 0 "bootstrap" "Iniciando verificacoes"

echo [1/6] Verificando ambiente...
call :runtime_event 5 "environment" "Verificando Windows, Node.js e npm"

if not exist "%ProgramFiles%\nodejs\node.exe" (
  node --version >nul 2>&1
  if errorlevel 1 (
    echo [INFO] Node.js nao encontrado. Tentando instalar automaticamente...
    call :runtime_event 6 "environment" "Node.js nao encontrado; tentando instalar via winget"

    powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-Command winget -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
    if errorlevel 1 (
      echo.
      echo [ERRO] Node.js nao esta instalado e o winget nao esta disponivel.
      call :runtime_event 6 "error" "Node.js ausente e winget indisponivel"
      echo Instale o Node.js LTS e execute novamente.
      pause
      exit /b 1
    )

    winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-source-agreements --accept-package-agreements
    if errorlevel 1 (
      echo.
      echo [ERRO] Falha ao instalar o Node.js automaticamente.
      call :runtime_event 6 "error" "Falha na instalacao automatica do Node.js"
      pause
      exit /b 1
    )

    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    call :runtime_event 8 "environment" "Node.js instalado automaticamente"
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
  call :runtime_event 8 "error" "Node.js nao pode ser executado"
  pause
  exit /b 1
)

"%NPM_CMD%" --version
if errorlevel 1 (
  echo.
  echo [ERRO] npm nao pode ser executado.
  call :runtime_event 9 "error" "npm nao pode ser executado"
  pause
  exit /b 1
)

echo [OK] Ambiente pronto.
call :progress 10 "Ambiente verificado"
call :runtime_event 10 "environment" "Ambiente pronto"

echo.

echo [2/6] Verificando dependencias...
call :runtime_event 15 "dependencies" "Verificando dependencias do projeto"

if not exist "%ROOT%node_modules\.bin\tsx.cmd" goto :install_deps
if not exist "%ROOT%node_modules\.bin\electron-builder.cmd" goto :install_deps

echo [OK] Dependencias ja instaladas. Pulando instalacao.
call :progress 30 "Dependencias ja existentes"
call :runtime_event 30 "dependencies" "Dependencias existentes; instalacao pulada"
goto :deps_done

:install_deps
echo [INFO] Primeira execucao ou dependencias incompletas.
call :runtime_event 18 "dependencies" "Primeira execucao ou dependencias incompletas"

if exist "%ROOT%package-lock.json" (
  echo [INFO] Instalando dependencias com npm ci...
  call :runtime_event 20 "dependencies" "Instalando dependencias com npm ci"
  call "%NPM_CMD%" ci --no-audit --no-fund
) else (
  echo [INFO] package-lock.json nao encontrado. Usando npm install...
  call :runtime_event 20 "dependencies" "Instalando dependencias com npm install"
  call "%NPM_CMD%" install --no-audit --no-fund
)

if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao instalar as dependencias.
  call :runtime_event 20 "error" "Falha ao instalar dependencias; erro original permanece acima"
  echo O erro original acima e necessario para diagnostico.
  pause
  exit /b 1
)

if not exist "%ROOT%node_modules\.bin\tsx.cmd" (
  echo.
  echo [ERRO] As dependencias foram instaladas, mas o tsx nao foi encontrado.
  call :runtime_event 29 "error" "tsx nao encontrado apos instalacao"
  pause
  exit /b 1
)

if not exist "%ROOT%node_modules\.bin\electron-builder.cmd" (
  echo.
  echo [ERRO] As dependencias foram instaladas, mas o electron-builder nao foi encontrado.
  call :runtime_event 29 "error" "electron-builder nao encontrado apos instalacao"
  pause
  exit /b 1
)

echo [OK] Dependencias instaladas.
call :progress 30 "Dependencias prontas"
call :runtime_event 30 "dependencies" "Dependencias prontas"

:deps_done
echo.

echo [3/6] Verificando build de producao...
call :runtime_event 33 "build" "Verificando build de producao"

if exist "%ROOT%dist\index.js" if exist "%ROOT%dist\public\index.html" (
  echo [OK] Build existente encontrado. Reutilizando arquivos.
  call :progress 35 "Build existente detectado"
  call :runtime_event 35 "build" "Build existente detectado; reutilizando arquivos"
) else (
  echo [INFO] Build ausente ou incompleto. Gerando novamente...
  call :progress 35 "Preparando build"
  call :runtime_event 35 "build" "Build ausente ou incompleto; gerando novamente"

  call "%ROOT%node_modules\.bin\tsx.cmd" script\build.ts
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha no build.
    call :runtime_event 35 "error" "Falha no build; erro original permanece acima"
    echo O erro original acima e necessario para diagnostico.
    pause
    exit /b 1
  )

  if not exist "%ROOT%dist\index.js" (
    echo.
    echo [ERRO] Build terminou sem gerar dist\index.js!
    call :runtime_event 35 "error" "Build terminou sem gerar dist\index.js"
    pause
    exit /b 1
  )

  if not exist "%ROOT%dist\public\index.html" (
    echo.
    echo [ERRO] Build terminou sem gerar dist\public\index.html!
    call :runtime_event 35 "error" "Build terminou sem gerar dist\public\index.html"
    pause
    exit /b 1
  )

  echo [OK] Build concluido.
  call :progress 60 "Build concluido"
  call :runtime_event 60 "build" "Build do cliente e servidor concluido"
)
echo.

echo [4/6] Verificando pacote Electron...
call :runtime_event 63 "electron-build" "Verificando pacote Electron"

if exist "%ROOT%dist\win-unpacked\Aura System.exe" (
  echo [OK] Electron ja empacotado. Reutilizando executavel existente.
  call :progress 65 "Electron existente detectado"
  call :runtime_event 65 "electron-build" "Electron existente detectado; reutilizando executavel"
) else (
  echo [INFO] Executavel Electron ausente. Empacotando...
  call :progress 65 "Iniciando empacotamento Electron"
  call :runtime_event 65 "electron-build" "Iniciando empacotamento Electron"

  call "%ROOT%node_modules\.bin\electron-builder.cmd" --config "%ROOT%electron-builder.config.json" --config.npmRebuild=false --config.asar=false
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha no empacotamento do Electron.
    call :runtime_event 65 "error" "Falha no empacotamento do Electron; erro original permanece acima"
    echo O erro original acima e necessario para diagnostico.
    pause
    exit /b 1
  )

  if not exist "%ROOT%dist\win-unpacked\Aura System.exe" (
    echo.
    echo [ERRO] Empacotamento terminou sem gerar o executavel do Electron!
    call :runtime_event 65 "error" "Empacotamento terminou sem gerar Aura System.exe"
    pause
    exit /b 1
  )

  echo [OK] Electron embalado.
  call :progress 85 "Electron empacotado"
  call :runtime_event 85 "electron-build" "Electron empacotado com sucesso"
)
echo.

echo [5/6] Iniciando servidor local na porta 5010...
call :runtime_event 88 "server" "Iniciando servidor local na porta 5010"

start "Aura Server" cmd /k "cd /d ""%ROOT%"" && ""%NODE_EXE%"" dist\index.js"
echo [OK] Servidor iniciado em janela separada.
call :progress 90 "Servidor iniciado"
call :runtime_event 90 "server" "Processo do servidor iniciado"

echo.

echo [6/6] Aguardando servidor responder...
call :runtime_event 90 "server" "Aguardando servidor responder na porta 5010"

set "SERVER_READY=0"
for /L %%N in (1,1,30) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5010' -TimeoutSec 1; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1

  if not errorlevel 1 (
    set "SERVER_READY=1"
    goto :server_ready
  )

  set /a "WAIT_PCT=90 + (%%N * 5 / 30)"
  call :progress !WAIT_PCT! "Aguardando servidor (%%N/30)"
  call :runtime_event !WAIT_PCT! "server" "Aguardando servidor (%%N/30)"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1"
)

:server_ready
if "%SERVER_READY%"=="0" (
  echo.
  echo [ERRO] O servidor nao respondeu na porta 5010 apos 30 segundos.
  echo Verifique a janela "Aura Server" para ver o erro do Node.
  call :progress 95 "Servidor nao respondeu"
  call :runtime_event 95 "error" "Servidor nao respondeu na porta 5010 em 30 segundos"
  pause
  taskkill /F /IM node.exe /T >nul 2>&1
  exit /b 1
)

echo [OK] Servidor respondeu na porta 5010.
call :progress 97 "Servidor pronto"
call :runtime_event 97 "server" "Servidor respondeu na porta 5010"

echo.
echo Iniciando Aura System...
call :progress 99 "Abrindo interface Electron"
call :runtime_event 99 "electron" "Abrindo interface Electron"

"%ROOT%dist\win-unpacked\Aura System.exe"
set "ELECTRON_EXIT=%ERRORLEVEL%"

if not "%ELECTRON_EXIT%"=="0" (
  echo.
  echo [ERRO] O Electron foi encerrado com codigo %ELECTRON_EXIT%.
  call :runtime_event 99 "error" "Electron encerrou com codigo %ELECTRON_EXIT%"
) else (
  call :progress 100 "Aura System finalizado"
  call :runtime_event 100 "shutdown" "Electron finalizado normalmente"
)

echo.
echo [INFO] Electron finalizou com codigo de saida: %ELECTRON_EXIT%
echo [INFO] Encerrando servidor...
call :runtime_event 100 "shutdown" "Encerrando servidor Node"
taskkill /F /IM node.exe /T >nul 2>&1

if not "%ELECTRON_EXIT%"=="0" (
  echo.
  echo A inicializacao terminou com erro.
  call :runtime_event 100 "error" "Inicializacao terminou com erro"
  pause
  exit /b %ELECTRON_EXIT%
)

echo.
echo Inicializacao concluida com sucesso.
call :runtime_event 100 "success" "Inicializacao concluida com sucesso"
pause
exit /b 0

:progress
set "PCT=%~1"
set "PMSG=%~2"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=[int]'%PCT%'; $n=[math]::Floor($p/5); $bar=('=' * $n)+('.' * (20-$n)); Write-Host ('Progresso geral: ['+$bar+'] '+$p+'%%  '+('%PMSG%'))"
exit /b

:runtime_event
set "RUNTIME_PROGRESS=%~1"
set "RUNTIME_PHASE=%~2"
set "RUNTIME_MESSAGE=%~3"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$dir=$env:AURA_RUNTIME_DIR; if (-not $dir) { exit 0 }; New-Item -ItemType Directory -Force -Path $dir | Out-Null; $now=(Get-Date).ToUniversalTime().ToString('o'); $record=[ordered]@{sequence=[int64]((Get-Date).Ticks); sessionId=$env:AURA_RUNTIME_SESSION; timestamp=$now; process='bootstrap'; pid=$PID; event='bootstrap-status'; message=$env:RUNTIME_MESSAGE; data=[ordered]@{phase=$env:RUNTIME_PHASE; progress=[int]$env:RUNTIME_PROGRESS}}; $line=$record | ConvertTo-Json -Compress -Depth 8; Add-Content -LiteralPath (Join-Path $dir 'aura-runtime.jsonl') -Value $line -Encoding UTF8; $status=[ordered]@{sessionId=$env:AURA_RUNTIME_SESSION; process='bootstrap'; updatedAt=$now; phase=$env:RUNTIME_PHASE; message=$env:RUNTIME_MESSAGE; progress=[int]$env:RUNTIME_PROGRESS; heartbeatMs=[int]($env:AURA_RUNTIME_HEARTBEAT_MS); pid=$PID}; $status | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $dir 'aura-runtime.json') -Encoding UTF8" >nul 2>&1
exit /b 0
