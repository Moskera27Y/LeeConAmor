@echo off
REM Túnel rápido al clon de voz (URL cambia en cada reinicio, solo para probar).
REM Para URL fija ver README sección "Túnel permanente".
cd /d "%~dp0"
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo Instalando cloudflared...
  winget install --id cloudflare.cloudflared --silent --accept-source-agreements --accept-package-agreements
)
echo Abriendo túnel hacia el clon local (puerto 7860)...
echo Copia la URL https://....trycloudflare.com y usala como CLON_URL.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:7860
pause
