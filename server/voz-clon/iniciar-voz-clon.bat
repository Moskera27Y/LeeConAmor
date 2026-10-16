@echo off
REM Léo voz clonada local (XTTS-v2 español). Primera vez descarga ~2GB, ten paciencia.
cd /d "%~dp0"
if not exist "venv\Scripts\python.exe" (
  echo Falta el entorno: corre primero: python -m venv --system-site-packages venv
  echo y luego: venv\Scripts\python -m pip install -r requirements.txt
  pause
  exit /b 1
)
venv\Scripts\python clonar.py
pause
