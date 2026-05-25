@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "TUNNEL_NAME=pixon-tunel"
cd /d "%PROJECT_DIR%"

echo ===================================================
echo             INICIANDO SERVICIOS - PIXON PC
echo ===================================================
echo.

if not exist ".env" (
    echo [ERROR] Falta .env. Ejecuta SETUP.bat primero.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [ERROR] Faltan dependencias. Ejecuta SETUP.bat primero.
    pause
    exit /b 1
)

if not exist "dist" (
    echo [*] No existe dist. Generando build...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Fallo npm run build.
        pause
        exit /b 1
    )
)

echo [*] Verificando MariaDB...
net start MariaDB >nul 2>&1
sc query MariaDB | findstr /I "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] MariaDB no esta corriendo. Revisa el servicio MariaDB.
    pause
    exit /b 1
) else (
    echo [OK] MariaDB activo.
)

where cloudflared >nul 2>&1
if errorlevel 1 (
    echo [ERROR] cloudflared no esta instalado o no esta en PATH.
    echo Instala con: winget install Cloudflare.cloudflared
    pause
    exit /b 1
)

echo [*] Cerrando instancias anteriores del servidor y tunel...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"name = 'node.exe'\" | Where-Object { $_.CommandLine -like '*\techstore\*' -or $_.CommandLine -like '*server/server.js*' -or $_.CommandLine -like '*server\\server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [*] Abriendo servidor y tunel en ventanas CMD...
start "SERVIDOR NODE - PIXON PC" cmd.exe /k "cd /d ""%PROJECT_DIR%"" && title SERVIDOR NODE - PIXON PC && color 0A && npm run start"
start "TUNEL CLOUDFLARE - PIXON PC" cmd.exe /k "cd /d ""%PROJECT_DIR%"" && title TUNEL CLOUDFLARE - PIXON PC && color 0E && cloudflared tunnel run %TUNNEL_NAME%"

echo [OK] Servicios enviados a ventanas CMD.
echo Local:   http://localhost:3000
echo Publico: https://pixon.com.mx
ping 127.0.0.1 -n 4 >nul
