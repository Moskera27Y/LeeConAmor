@echo off
REM LeeConAmor - doble clic: abre tu pagina publicada en Vercel y prende la voz local.
cd /d "%~dp0"
set DEPLOY_URL=
for /f "tokens=1,* delims==" %%a in (.env.local) do if "%%a"=="DEPLOY_URL" set DEPLOY_URL=%%b

echo Prendiendo voz local (API + clon)...
start "LeeConAmor API" cmd /k "npm run api:dev"
timeout /t 3 /nobreak >nul
start "LeeConAmor CLON" cmd /k "cd server\voz-clon && venv\Scripts\python clonar.py"

if defined DEPLOY_URL (
  echo Abriendo tu pagina publicada: %DEPLOY_URL%
  timeout /t 4 /nobreak >nul
  start "" "%DEPLOY_URL%"
) else (
  echo No hay DEPLOY_URL en .env.local: abro la version local.
  start "LeeConAmor WEB" cmd /k "npm run dev"
  timeout /t 6 /nobreak >nul
  start "" "http://localhost:5173/"
)
echo Listo. Usa Chrome o Edge. Deja las ventanas abiertas mientras juegas.
pause
