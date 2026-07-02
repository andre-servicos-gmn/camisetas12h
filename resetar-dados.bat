@echo off
REM Reseta os dados simulados (zera e repopula o banco). Use antes da reuniao
REM para que os alertas fiquem "frescos" em relacao ao horario atual.
cd /d "%~dp0backend"
echo Resetando os dados da demo...
echo.
".venv\Scripts\python.exe" -m app.seed
echo.
echo Dados resetados. Pode fechar esta janela.
pause
