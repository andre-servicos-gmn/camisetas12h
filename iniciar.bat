@echo off
REM ============================================================
REM  C12H - Central de Inteligencia Operacional
REM  Da dois cliques aqui para subir a POC e abrir no navegador.
REM ============================================================
cd /d "%~dp0"

echo Iniciando a C12H...
echo (Duas janelas pretas vao abrir - mantenha-as abertas durante a demo.)
echo.

start "C12H - Backend (porta 8000)"  cmd /k "%~dp0_backend.bat"
start "C12H - Frontend (porta 5173)" cmd /k "%~dp0_frontend.bat"

echo Aguardando os servidores subirem...
timeout /t 7 >nul

start "" http://localhost:5173

echo.
echo Pronto! Abriu no navegador: http://localhost:5173
echo Painel de TV (tela cheia, tecla F11): http://localhost:5173/tv
echo.
echo Para encerrar: feche as duas janelas pretas.
echo.
pause
