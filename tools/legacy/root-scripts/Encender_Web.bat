@echo off
title Pixon PC Web Server
color 0A

echo =========================================================
echo.       INICIANDO EL SERVIDOR DE PIXON PC (pixon.com.mx)
echo =========================================================
echo.

cd /d "C:\Users\Pinzon\Documents\techstore"

echo.
echo Limpiando conexiones anteriores (Puerto 3000 y Cloudflare)...
taskkill /F /IM cloudflared.exe >nul 2>&1
powershell -Command "try { Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000, 3001 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue } catch {}"
timeout /t 2 /nobreak > nul

echo.
echo 1) Levantando Base de Datos MariaDB y Sitio Web...
net start MariaDB >nul 2>&1
start "Node Server Pixon PC" cmd /k "npm run start"

:: Dar tiempo a que Node encienda antes del tunel
timeout /t 3 /nobreak > nul

echo 2) Encendiendo embudo web de Cloudflare...
start "Cloudflare Tunnel Pixon PC" cmd /k "cloudflared tunnel run --url http://localhost:3000 pixon-tunel"

echo.
echo =========================================================
echo  TODO LISTO Y ACTIVO. 
echo  No cierres las dos ventanas negras si quieres que tu web
echo  siga en vivo. Para apagar tu web, simplemente cierralas.
echo =========================================================
echo.
pause
