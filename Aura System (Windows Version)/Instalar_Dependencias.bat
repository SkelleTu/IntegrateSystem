@echo off
title Aura System - Instalador
echo Instalando dependencias do sistema...
cd /d "%~dp0"
call npm install
echo.
echo Concluido! Agora voce pode usar o Aura.bat para iniciar.
pause
