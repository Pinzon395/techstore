@echo off
setlocal enabledelayedexpansion

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo.
echo ============================================================
echo              SETUP LOCAL - PIXON PC
echo ============================================================
echo.

echo [1/5] Verificando Node.js y npm...
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado o no esta en PATH.
    echo Instala Node.js 20.19+ desde https://nodejs.org/
    pause
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm no esta instalado o no esta en PATH.
    pause
    exit /b 1
)
node --version
npm --version

echo.
echo [2/5] Preparando archivo .env...
if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo [OK] Se creo .env desde .env.example.
    echo [IMPORTANTE] Abre .env y llena DB_PASSWORD, SESSION_SECRET y claves reales.
) else (
    echo [OK] .env ya existe; no se sobrescribe.
)

echo.
echo [3/5] Instalando dependencias...
if exist "package-lock.json" (
    call npm ci
) else (
    call npm install
)
if errorlevel 1 (
    echo [ERROR] Fallo la instalacion de dependencias.
    pause
    exit /b 1
)

echo.
echo [4/5] Generando build...
call npm run build
if errorlevel 1 (
    echo [ERROR] Fallo npm run build.
    pause
    exit /b 1
)

echo.
echo [5/5] Setup completado.
echo.
echo Si es una PC nueva, crea la base de datos con:
echo   mysql -u root -p ^< server\sql\01-schema.sql
echo   mysql -u root -p pixon_db ^< server\sql\02-seed.sql
echo.
echo Si usas DB_USER=pixon_app, crea el usuario en MariaDB:
echo   CREATE USER IF NOT EXISTS 'pixon_app'@'localhost' IDENTIFIED BY 'cambia_esta_password';
echo   CREATE USER IF NOT EXISTS 'pixon_app'@'127.0.0.1' IDENTIFIED BY 'cambia_esta_password';
echo   GRANT ALL PRIVILEGES ON pixon_db.* TO 'pixon_app'@'localhost';
echo   GRANT ALL PRIVILEGES ON pixon_db.* TO 'pixon_app'@'127.0.0.1';
echo   FLUSH PRIVILEGES;
echo.
echo Para arrancar:
echo   INICIAR.bat
echo.
pause
