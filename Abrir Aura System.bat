@echo off
cd /d "%~dp0"
title Aura System

set "URL=http://127.0.0.1:5010"

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto :open

if exist "%~dp0dist\index.js" (
    start "Aura Server" /min cmd /c "cd /d ""%~dp0"" && node dist\index.js"
) else (
    start "Aura Server" /min cmd /c "cd /d ""%~dp0"" && npm run dev"
)

for /L %%N in (1,1,30) do (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 goto :open
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Milliseconds 500"
)

echo.
echo Nao foi possivel iniciar a Aura na porta 5010.
echo Verifique a janela do servidor para ver o erro.
pause
exit /b 1

:open
start "" "%URL%"
exit /b 0
