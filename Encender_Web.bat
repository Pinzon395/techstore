@echo off
setlocal EnableExtensions

set "PROJECT_DIR=%~dp0"
set "TUNNEL_NAME=pixon-tunel"
set "APP_PORT=3000"
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

echo [*] Generando la version actual de la pagina...
call npm run build
if errorlevel 1 (
    echo [ERROR] Fallo el build. No se iniciara el servidor con archivos incompletos.
    pause
    exit /b 1
)

echo [*] Verificando conexion real con MariaDB...
call :check_database
if errorlevel 1 (
    echo [*] Intentando iniciar el servicio MariaDB...
    net start MariaDB >nul 2>&1
    timeout /t 2 /nobreak >nul
    call :check_database
)

if errorlevel 1 (
    echo [ERROR] No fue posible conectar con MariaDB. Revisa que MariaDB este iniciado y las variables DB_* de .env.
    pause
    exit /b 1
)
echo [OK] MariaDB responde correctamente.

where cloudflared >nul 2>&1
if errorlevel 1 (
    echo [ERROR] cloudflared no esta instalado o no esta en PATH.
    echo Instala con: winget install Cloudflare.cloudflared
    pause
    exit /b 1
)

echo [*] Cerrando solo instancias anteriores de Pixon PC...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process ^| Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'server[\\/]+server\.js' } ^| ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [*] Iniciando servidor en el puerto %APP_PORT%...
start "SERVIDOR NODE - PIXON PC" cmd.exe /k "cd /d ""%PROJECT_DIR%"" && title SERVIDOR NODE - PIXON PC && color 0A && npm run start"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$limit=(Get-Date).AddSeconds(15); do { if (Get-NetTCPConnection -LocalPort %APP_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 }; Start-Sleep -Seconds 1 } while ((Get-Date) -lt $limit); exit 1"
if errorlevel 1 (
    echo [ERROR] El servidor no abrio el puerto %APP_PORT%. Revisa la ventana SERVIDOR NODE - PIXON PC.
    pause
    exit /b 1
)

echo [OK] Servidor listo en http://localhost:%APP_PORT%
echo [*] Iniciando tunel Cloudflare...
start "TUNEL CLOUDFLARE - PIXON PC" cmd.exe /k "cd /d ""%PROJECT_DIR%"" && title TUNEL CLOUDFLARE - PIXON PC && color 0E && cloudflared tunnel run %TUNNEL_NAME%"

echo.
echo [OK] Pixon PC esta listo.
echo Local:   http://localhost:%APP_PORT%
echo Publico: https://pixon.com.mx
echo.
exit /b 0

:check_database
node -e "require('dotenv').config(); const { createPoolFromEnv } = require('./server/db/connection'); const pool = createPoolFromEnv(); pool.query('SELECT 1').then(function(){ return pool.end(); }).then(function(){ process.exit(0); }).catch(function(){ pool.end().then(function(){ process.exit(1); }, function(){ process.exit(1); }); });"
exit /b %errorlevel%
