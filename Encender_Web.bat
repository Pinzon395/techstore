@echo off
setlocal EnableExtensions
title PIXON PC - Estado del hosting
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\manage-web.ps1" -Action Restart
if errorlevel 1 (
    echo [ERROR] El hosting no supero la verificacion. Revisa el error anterior y la carpeta logs.
    pause
    exit /b 1
)
echo.
echo [OK] Hosting activo: https://pixon.com.mx
echo El servidor y el tunel siguen funcionando en segundo plano.
echo Para apagarlos ejecuta Apagar_Web.bat.
echo.
echo Presiona una tecla para cerrar esta ventana.
pause >nul
exit /b 0
