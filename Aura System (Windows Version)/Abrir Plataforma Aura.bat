@echo off
setlocal
cd /d "%~dp0"

echo Abrindo Aura System...

:: Verifica se a pasta node_modules existe
if not exist "node_modules" (
    echo Erro: Pasta node_modules nao encontrada. 
    echo Certifique-se de que voce extraiu todos os arquivos corretamente.
    pause
    exit /b
)

:: Tenta abrir com o electron local
start "" "node_modules\.bin\electron.cmd" .

if %errorlevel% neq 0 (
    echo Ocorreu um erro ao tentar abrir a plataforma.
    pause
)

exit
