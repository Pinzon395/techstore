@echo off
:: ================================================================
::  Encender_Web.bat — Pixon PC
::  Abre UNA ventana de Windows Terminal con 2 pestañas:
::    Pestaña 1  → Servidor Node.js  (npm run start)
::    Pestaña 2  → Cloudflare Tunnel (pixon-tunel)
:: ================================================================

echo ===================================================
echo             INICIANDO SERVICIOS - PIXON PC         
echo ===================================================
echo.

:: 1. Matar procesos anteriores para liberar puertos
echo [*] Liberando puertos (deteniendo node y cloudflared anteriores)...
taskkill /F /IM cloudflared.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
ping 127.0.0.1 -n 2 >nul

:: 2. Asegurar que MariaDB este corriendo
echo [*] Verificando base de datos MariaDB...
net start MariaDB >nul 2>&1
echo [OK] Base de datos activa.

:: 3. Abrir Windows Terminal con 2 pestañas en 1 sola ventana
echo [*] Iniciando Windows Terminal con Servidor y Tunel...
wt -d "C:\Users\Pinzon\Documents\techstore" cmd /k "title SERVIDOR NODE & color 0A & echo ========================================= & echo   SERVIDOR NODE.JS - PIXON PC & echo ========================================= & echo. & npm run start" ^; new-tab -d "C:\Users\Pinzon\Documents\techstore" cmd /k "title TUNEL CLOUDFLARE & color 0E & echo ========================================= & echo   TUNEL CLOUDFLARE - PIXON PC & echo ========================================= & echo. & cloudflared tunnel run pixon-tunel"

echo [OK] Proceso completado. Puedes cerrar esta ventana.
ping 127.0.0.1 -n 4 >nul
