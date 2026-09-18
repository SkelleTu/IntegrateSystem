@echo off
cd /d "%~dp0"
title Aura System - Debug

echo.
echo ============================================================
echo Aura System - Producao (Modo Debug)
echo ============================================================
echo.

echo [1/4] Build de producao...
npm run build
if errorlevel 1 (
  echo.
  echo [ERRO] Falha no build!
  echo Verifique os logs acima.
  pause
  exit /b 1
)
echo [OK] Build concluido.
echo.

echo [2/4] Iniciando servidor na porta 5010...
start "Aura Server" cmd /c "node dist/index.js"
echo [OK] Servidor iniciado em janela separada.
echo.

echo [3/4] Aguardando servidor subir (5s)...
timeout /t 5 /nobreak >nul
echo [OK] Tempo de espera finalizado.
echo.

echo [4/4] Iniciando Electron (modo verbose)...
echo.
echo ------------------------------------------------------------
echo COMANDO: npx electron electron/main.js
echo ------------------------------------------------------------
echo.

npx electron electron/main.js

echo.
echo ------------------------------------------------------------
echo Electron finalizou com codigo de saida: %ERRORLEVEL%
echo ------------------------------------------------------------
echo.

if %ERRORLEVEL% NEQ 0 (
  echo [ERRO] Electron falhou!
  echo Possiveis causas:
  echo   - electron/main.js tem erro de sintaxe (import/require)
  echo   - Falta modulo 'electron' instalado
  echo   - Porta 5010 nao respondendo
  echo   - Erro no preload.js
  echo.
  echo Teste manual:
  echo   npx electron electron/main.js
  echo.
) else (
  echo [OK] Electron fechou normalmente.
)

echo [INFO] Encerrando servidor...
taskkill /F /IM node.exe /T >nul 2>&1

echo.
echo Pressione qualquer tecla para fechar...
pause