@echo off
setlocal

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo.
echo ============================================================
echo              INICIAR LOCAL - PIXON PC
echo ============================================================
echo.

if not exist ".env" (
    echo [ERROR] Falta .env. Ejecuta SETUP.bat primero o copia .env.example a .env.
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

echo [*] Intentando iniciar MariaDB si existe como servicio...
net start MariaDB >nul 2>&1

echo.
echo [OK] Servidor local en http://localhost:3000
echo.
call npm run start

pause
