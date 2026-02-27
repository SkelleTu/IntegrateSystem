@echo off
setlocal
cd /d "%~dp0"

echo [Aura System] Iniciando Servidor Local para Modo Offline...

:: Verifica se o Node.js está instalado
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js não encontrado. Por favor, instale o Node.js para rodar offline.
    pause
    exit /b
)

:: Tenta iniciar o servidor em segundo plano (usando o Electron para gerenciar ou via comando direto)
:: O arquivo main.js já está configurado para tentar subir o servidor.
echo [Aura System] Abrindo Interface Desktop...

start "" "node_modules\.bin\electron.cmd" .

if %errorlevel% neq 0 (
    echo [ERRO] Falha ao abrir a plataforma. Verifique se a pasta node_modules existe.
    pause
)

exit
