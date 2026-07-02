@echo off
REM ============================================================
REM  C12H - Instalacao / reparo
REM  Use SO na primeira vez, ou se algo parar de funcionar.
REM  No dia a dia, use iniciar.bat.
REM ============================================================
cd /d "%~dp0"

echo [1/3] Backend: criando ambiente e instalando dependencias...
cd /d "%~dp0backend"
python -m venv .venv
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
echo.

echo [2/3] Backend: populando o banco com os dados simulados...
".venv\Scripts\python.exe" -m app.seed
echo.

echo [3/3] Frontend: instalando dependencias (pode demorar alguns minutos)...
cd /d "%~dp0frontend"
call npm install
echo.

echo ============================================================
echo  Instalacao concluida! Agora de dois cliques em iniciar.bat
echo ============================================================
pause
