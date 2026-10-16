@echo off
REM LeeConAmor - doble clic para prender pagina + voz. No pide nada.
cd /d "%~dp0"
echo Prendiendo LeeConAmor...
echo   API (voz y oido): http://localhost:3001/api/health
echo   Clon de voz:      http://localhost:7860/salud (opcional, sin cuota)
echo   Pagina:           http://localhost:5173/
echo Deja estas ventanas abiertas mientras juegas. Cierralas al terminar.
start "LeeConAmor API" cmd /k "npm run api:dev"
timeout /t 3 /nobreak >nul
start "LeeConAmor CLON" cmd /k "cd server\voz-clon && venv\Scripts\python clonar.py"
start "LeeConAmor WEB" cmd /k "npm run dev"
echo Listo. Abre http://localhost:5173/ en Chrome o Edge.
pause
