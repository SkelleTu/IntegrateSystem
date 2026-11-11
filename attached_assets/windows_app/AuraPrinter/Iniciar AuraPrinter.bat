@echo off
setlocal
title AuraPrinter - Aura System
set "AURA_LABELS_WS_URL=wss://integrated-system-1c86.onrender.com/ws/labels"
if not defined AURA_LABELS_WS_TOKEN (
  echo.
  echo Configure o token privado do gateway de etiquetas.
  set /p "AURA_LABELS_WS_TOKEN=Token: "
)
if not defined AURA_LABELS_WS_TOKEN (
  echo Token nao informado. O AuraPrinter nao sera iniciado.
  pause
  exit /b 1
)
if not exist "%~dp0AuraPrinter.exe" (
  echo AuraPrinter.exe nao encontrado nesta pasta.
  pause
  exit /b 1
)
start "" "%~dp0AuraPrinter.exe"
endlocal
