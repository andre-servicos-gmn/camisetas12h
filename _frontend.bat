@echo off
REM Sobe o frontend Vite (porta 5173). Chamado pelo iniciar.bat.
cd /d "%~dp0frontend"
title C12H - Frontend (porta 5173)
echo Frontend C12H rodando em http://localhost:5173
echo Feche esta janela para parar o frontend.
echo.
call npm run dev -- --port 5173
echo.
echo (Frontend parou. Pressione uma tecla para fechar.)
pause >nul
