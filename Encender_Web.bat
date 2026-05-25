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
echo [OK] MariaDB verificado.

where cloudflared >nul 2>&1
if errorlevel 1 (
    echo [ERROR] cloudflared no esta instalado o no esta en PATH.
    echo Instala con: winget install Cloudflare.cloudflared
    pause
    exit /b 1
)

set "NODE_RUNNING="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":3000 .*LISTENING"') do set "NODE_RUNNING=%%P"

set "TUNNEL_RUNNING="
for /f "tokens=2" %%P in ('tasklist /FI "IMAGENAME eq cloudflared.exe" /NH 2^>nul ^| findstr /I "cloudflared.exe"') do set "TUNNEL_RUNNING=%%P"

echo [*] Abriendo servidor y tunel en ventanas CMD...

if defined NODE_RUNNING (
    echo [OK] Servidor Node ya esta activo en puerto 3000. PID: %NODE_RUNNING%
) else (
    start "SERVIDOR NODE - PIXON PC" cmd.exe /k "cd /d ""%PROJECT_DIR%"" && title SERVIDOR NODE - PIXON PC && color 0A && npm run start"
)

if defined TUNNEL_RUNNING (
    echo [OK] Cloudflare Tunnel ya esta activo. PID: %TUNNEL_RUNNING%
) else (
    start "TUNEL CLOUDFLARE - PIXON PC" cmd.exe /k "cd /d ""%PROJECT_DIR%"" && title TUNEL CLOUDFLARE - PIXON PC && color 0E && cloudflared tunnel run %TUNNEL_NAME%"
)

echo [OK] Servicios enviados a ventanas CMD.
echo Local:   http://localhost:3000
echo Publico: https://pixon.com.mx
ping 127.0.0.1 -n 4 >nul
