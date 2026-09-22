@echo off
cd /d "%~dp0"
title Aura System - Producao

echo.
echo ============================================================
echo Aura System - Producao
echo ============================================================
echo.

echo [1/4] Build de producao...
call "%~dp0node_modules\.bin\tsx.cmd" script\build.ts
if errorlevel 1 (
  echo.
  echo [ERRO] Falha no build!
  pause
  exit /b 1
)
if not exist "dist\index.js" (
  echo.
  echo [ERRO] Build terminou sem gerar dist\index.js!
  pause
  exit /b 1
)
if not exist "dist\public\index.html" (
  echo.
  echo [ERRO] Build terminou sem gerar dist\public\index.html!
  pause
  exit /b 1
)
echo [OK] Build concluido.
echo.

if not exist "dist\win-unpacked\Aura System.exe" (
  echo [2/4] Empacotando Electron...
  call "%~dp0node_modules\.bin\electron-builder.cmd" --config "electron-builder.config.json" --config.npmRebuild=false --config.asar=false
  if errorlevel 1 (
    echo [ERRO] Falha no empacotamento!
    pause
    exit /b 1
  )
  if not exist "dist\win-unpacked\Aura System.exe" (
    echo [ERRO] Empacotamento terminou sem gerar o executavel do Electron!
    pause
    exit /b 1
  )
  echo [OK] Electron embalado.
) else (
  echo [2/4] Electron ja embalado, pulando.
)
echo.

echo [3/4] Iniciando servidor na porta 5010...
start "Aura Server" cmd /k "cd /d ""%~dp0"" && node dist\index.js"
echo [OK] Servidor iniciado em janela separada.
echo.

echo [4/4] Aguardando servidor responder na porta 5010...
set "SERVER_READY=0"
for /L %%N in (1,1,30) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5010' -TimeoutSec 1; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    set "SERVER_READY=1"
    goto :server_ready
  )
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1"
)
:server_ready
if "%SERVER_READY%"=="0" (
  echo [ERRO] O servidor nao respondeu na porta 5010 apos 30 segundos.
  echo.
  echo Verifique a janela "Aura Server" para ver o erro do Node.
  pause
  taskkill /F /IM node.exe /T >nul 2>&1
  exit /b 1
)
echo [OK] Servidor respondeu na porta 5010.
echo.

echo Iniciando Aura System...
"%~dp0dist\win-unpacked\Aura System.exe"
echo.
echo [INFO] Electron finalizou com codigo de saida: %ERRORLEVEL%
echo [INFO] Encerrando servidor...
taskkill /F /IM node.exe /T >nul 2>&1

echo.
echo Pressione qualquer tecla para fechar...
pause
