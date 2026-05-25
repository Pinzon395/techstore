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

where wt >nul 2>&1
if errorlevel 1 (
    echo [ADVERTENCIA] Windows Terminal no esta disponible. Se abriran ventanas CMD separadas.
    start "SERVIDOR NODE - PIXON PC" cmd /k "cd /d ""%PROJECT_DIR%"" && npm run start"
    start "TUNEL CLOUDFLARE - PIXON PC" cmd /k "cd /d ""%PROJECT_DIR%"" && cloudflared tunnel run %TUNNEL_NAME%"
    exit /b 0
)

echo [*] Abriendo servidor y tunel en Windows Terminal...
wt -d "%PROJECT_DIR%" cmd /k "title SERVIDOR NODE - PIXON PC & color 0A & npm run start" ^; new-tab -d "%PROJECT_DIR%" cmd /k "title TUNEL CLOUDFLARE - PIXON PC & color 0E & cloudflared tunnel run %TUNNEL_NAME%"

echo [OK] Servicios enviados a Windows Terminal.
echo Local:   http://localhost:3000
echo Publico: https://pixon.com.mx
ping 127.0.0.1 -n 4 >nul
