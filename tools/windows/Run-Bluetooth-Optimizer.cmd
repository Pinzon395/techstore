@echo off
setlocal
set "SCRIPT=%~dp0PixonBluetoothOptimizer.ps1"

if not exist "%SCRIPT%" (
  echo No se encontro PixonBluetoothOptimizer.ps1 junto a este iniciador.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
set "EXITCODE=%ERRORLEVEL%"
echo.
if not "%EXITCODE%"=="0" echo El optimizador termino con codigo %EXITCODE%.
pause
exit /b %EXITCODE%
