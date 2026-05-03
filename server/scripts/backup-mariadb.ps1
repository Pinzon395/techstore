# ═══════════════════════════════════════════════════════════════════════════
#  Pixon PC — Backup automático de MariaDB
#
#  Ejecutar manualmente:
#     powershell -ExecutionPolicy Bypass -File server\scripts\backup-mariadb.ps1
#
#  Programar diario a las 03:00 (registrar como tarea programada de Windows):
#     schtasks /Create /SC DAILY /TN "PixonBackupDB" /ST 03:00 ^
#       /TR "powershell -ExecutionPolicy Bypass -File C:\Users\Pinzon\Documents\techstore\server\scripts\backup-mariadb.ps1" ^
#       /RU SYSTEM /F
#
#  Variables: lee .env del proyecto (DB_*).
# ═══════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = 'Stop'

# Localizar raíz del proyecto (asume que el script está en server/scripts/)
$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
$EnvFile     = Join-Path $ProjectRoot ".env"
$BackupDir   = Join-Path $ProjectRoot "backups"
$RetainDays  = 14

# Cargar variables de .env
if (-not (Test-Path $EnvFile)) {
    Write-Error "No se encontró .env en $EnvFile"
    exit 1
}
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$') {
        $key = $matches[1]
        $val = $matches[2].Trim('"').Trim("'")
        Set-Item -Path "Env:$key" -Value $val
    }
}

$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "127.0.0.1" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "3306" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "pixon_app" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "pixon" }
$DB_PASS = $env:DB_PASSWORD

if (-not $DB_PASS) {
    Write-Error "DB_PASSWORD no está definida en .env"
    exit 1
}

# Localizar mysqldump (instalación típica de MariaDB en Windows)
$dumpExe = $null
foreach ($candidate in @(
    "C:\Program Files\MariaDB 11.4\bin\mysqldump.exe",
    "C:\Program Files\MariaDB 11.0\bin\mysqldump.exe",
    "C:\Program Files\MariaDB 10.11\bin\mysqldump.exe",
    "C:\Program Files\MariaDB 10.6\bin\mysqldump.exe"
)) {
    if (Test-Path $candidate) { $dumpExe = $candidate; break }
}
if (-not $dumpExe) {
    # Fallback: buscar en PATH
    $cmd = Get-Command mysqldump -ErrorAction SilentlyContinue
    if ($cmd) { $dumpExe = $cmd.Path }
}
if (-not $dumpExe) {
    Write-Error "No se encontró mysqldump.exe. Asegúrate de que MariaDB esté instalada."
    exit 1
}

# Crear carpeta de backups
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Generar nombre con fecha
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$dumpFile  = Join-Path $BackupDir "pixon_$timestamp.sql"
$zipFile   = Join-Path $BackupDir "pixon_$timestamp.zip"

Write-Host "→ Backup de $DB_NAME @ $DB_HOST..."
Write-Host "  Destino: $zipFile"

# Pasar password via variable de entorno (no aparece en línea de comando)
$env:MYSQL_PWD = $DB_PASS
try {
    & $dumpExe `
        --host=$DB_HOST --port=$DB_PORT --user=$DB_USER `
        --single-transaction --routines --triggers --events `
        --default-character-set=utf8mb4 `
        --result-file="$dumpFile" `
        $DB_NAME

    if ($LASTEXITCODE -ne 0) { throw "mysqldump falló (exit $LASTEXITCODE)" }

    # Comprimir y borrar el .sql crudo
    Compress-Archive -Path $dumpFile -DestinationPath $zipFile -Force
    Remove-Item $dumpFile -Force

    $sizeKb = [math]::Round((Get-Item $zipFile).Length / 1KB, 1)
    Write-Host "✓ Backup creado: $zipFile ($sizeKb KB)"
}
finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

# Rotación: borrar backups con más de $RetainDays días
$cutoff = (Get-Date).AddDays(-$RetainDays)
$deleted = 0
Get-ChildItem -Path $BackupDir -Filter "pixon_*.zip" |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object {
        Remove-Item $_.FullName -Force
        $deleted++
    }
if ($deleted -gt 0) {
    Write-Host "↻ Rotación: $deleted backup(s) viejos eliminados (>$RetainDays días)"
}

Write-Host "✓ Listo."
