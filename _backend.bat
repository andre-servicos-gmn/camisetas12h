@echo off
REM Sobe o backend FastAPI (porta 8000). Chamado pelo iniciar.bat.
cd /d "%~dp0backend"
title C12H - Backend (porta 8000)
echo Backend C12H rodando em http://localhost:8000
echo Feche esta janela para parar o backend.
echo.
".venv\Scripts\python.exe" -m uvicorn app.main:app --port 8000
echo.
echo (Backend parou. Pressione uma tecla para fechar.)
pause >nul
