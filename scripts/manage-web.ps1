param([ValidateSet('Restart', 'Stop')][string]$Action = 'Restart')

$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectDir
$supervisorPath = Join-Path $PSScriptRoot 'supervise-web.ps1'
$logDir = Join-Path $projectDir 'logs'
$hash = [Security.Cryptography.SHA256]::Create()
$key = ([BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($projectDir.ToLowerInvariant())))).Replace('-', '')
$hash.Dispose()
$controlMutex = New-Object Threading.Mutex($false, "Local\PixonWebControl-$key")
$ownsControl = $false

function Get-HostingProcesses {
    $all = @(Get-CimInstance Win32_Process)
    $portOwners = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)
    $found = @{}
    foreach ($item in $all) {
        if ($item.ProcessId -eq $PID) { continue }
        $command = [string]$item.CommandLine
        $isSupervisor = $item.Name -eq 'powershell.exe' -and $command -match ('-File\s+"?' + [regex]::Escape($supervisorPath) + '"?(\s|$)')
        $isServer = $item.Name -eq 'node.exe' -and ($command -match [regex]::Escape((Join-Path $projectDir 'server\server.js')) -or $command -match [regex]::Escape(($projectDir + '/server/server.js')) -or ($item.ProcessId -in $portOwners -and $command -match 'server[\\/]server\.js'))
        $isTunnel = $item.Name -eq 'cloudflared.exe' -and $command -match '\btunnel\b' -and $command -match '\b(pixon-tunel|aaa34d60-0e27-4f86-acee-bbfa24a0f49b)\b'
        $isLegacyWindow = $item.Name -eq 'cmd.exe' -and $command -match '(SERVIDOR NODE|TUNEL CLOUDFLARE) - PIXON PC'
        if ($isSupervisor -or $isServer -or $isTunnel -or $isLegacyWindow) { $found[$item.ProcessId] = $item }
    }
    # Incluye hijos de supervisores y ventanas antiguas, incluso si no llegaron a abrir el puerto.
    do {
        $added = $false
        foreach ($item in $all) {
            if ($found.ContainsKey($item.ParentProcessId) -and -not $found.ContainsKey($item.ProcessId)) {
                $found[$item.ProcessId] = $item
                $added = $true
            }
        }
    } while ($added)
    return @($found.Values)
}

function Stop-Hosting {
    Write-Host '[*] Cerrando el supervisor, el servidor y el tunel de Pixon...'
    $previous = @(Get-HostingProcesses)
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $supervisorPath -Stop
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo solicitar el apagado del supervisor.' }
    $deadline = (Get-Date).AddSeconds(10)
    do {
        $alive = @($previous | Where-Object {
            $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($_.ProcessId)"
            $current -and $current.CreationDate -eq $_.CreationDate
        })
        if ($alive.Count -eq 0) { break }
        Start-Sleep -Milliseconds 250
    } while ((Get-Date) -lt $deadline)
    foreach ($item in $alive) {
        $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($item.ProcessId)"
        if ($current -and $current.CreationDate -eq $item.CreationDate) {
            Write-Host "[*] Cerrando $($item.Name), PID $($item.ProcessId)..."
            Stop-Process -Id $item.ProcessId -Force -ErrorAction Stop
        }
    }
    if (@(Get-HostingProcesses).Count -gt 0) { throw 'Quedan procesos de Pixon activos. No se iniciaran duplicados.' }
    if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
        throw 'El puerto 3000 sigue ocupado por otro proceso. No se inicio otra instancia.'
    }
    Write-Host '[OK] Hosting detenido y puerto 3000 libre.'
}

function Wait-Http([string]$Url, [switch]$Health) {
    $deadline = (Get-Date).AddSeconds(60)
    $lastError = ''
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -Headers @{'Cache-Control' = 'no-cache'}
            if ($response.StatusCode -ne 200) { throw "HTTP $($response.StatusCode)" }
            if ($Health -and ($response.Content | ConvertFrom-Json).ok -ne $true) { throw 'Respuesta de salud invalida' }
            Write-Host "[OK] HTTP 200: $Url"
            return
        } catch { $lastError = $_.Exception.Message }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw "No responde $Url : $lastError"
}

try {
    try { $ownsControl = $controlMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $ownsControl = $true }
    if (-not $ownsControl) { throw 'Ya hay un arranque o apagado en curso. Espera a que termine.' }
    Stop-Hosting
    if ($Action -eq 'Stop') { exit 0 }
    foreach ($required in @('.env', 'node_modules')) {
        if (-not (Test-Path -LiteralPath (Join-Path $projectDir $required))) { throw "Falta $required. Ejecuta SETUP.bat." }
    }
    Get-Command node.exe, npm.cmd, cloudflared.exe -ErrorAction Stop | Out-Null
    Write-Host '[*] Comprobando la sintaxis de todos los archivos del servidor...'
    foreach ($source in (Get-ChildItem -LiteralPath (Join-Path $projectDir 'server') -Filter '*.js' -File -Recurse)) {
        & node.exe --check $source.FullName
        if ($LASTEXITCODE -ne 0) { throw "Error de sintaxis: $($source.FullName)" }
    }
    Write-Host '[*] Generando la web actual...'
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Fallo el build. El hosting permanece apagado.' }
    Write-Host '[*] Verificando MariaDB...'
    $databaseCheck = "require('dotenv').config({quiet:true}); const pool=require('./server/db/connection').createPoolFromEnv(); const deadline=setTimeout(()=>process.exit(1),10000); pool.query('SELECT 1').then(()=>pool.end()).then(()=>{clearTimeout(deadline);process.exit(0)}).catch(()=>process.exit(1));"
    & node.exe -e $databaseCheck
    if ($LASTEXITCODE -ne 0) {
        Start-Service MariaDB
        & node.exe -e $databaseCheck
        if ($LASTEXITCODE -ne 0) { throw 'MariaDB no responde. Revisa el servicio y las variables DB_* de .env.' }
    }
    & cloudflared.exe tunnel ingress validate
    if ($LASTEXITCODE -ne 0) { throw 'La configuracion de Cloudflare no es valida.' }
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $supervisor = Start-Process powershell.exe -WindowStyle Hidden -PassThru -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $supervisorPath + '"')) -RedirectStandardOutput (Join-Path $logDir 'supervisor.out.log') -RedirectStandardError (Join-Path $logDir 'supervisor.err.log')
    Wait-Http 'http://127.0.0.1:3000/api/health' -Health
    Wait-Http 'http://127.0.0.1:20241/ready'
    Wait-Http ('https://pixon.com.mx/api/health?startup=' + [guid]::NewGuid()) -Health
    Wait-Http 'https://pixon.com.mx/'
    Wait-Http 'https://www.pixon.com.mx/'
    if ($supervisor.HasExited) { throw 'El supervisor se cerro. Revisa logs/supervisor.err.log.' }
    Write-Host '[OK] Hosting iniciado desde cero y dominio publico verificado.'
    Write-Host 'Puedes cerrar esta ventana. Para detenerlo usa Apagar_Web.bat.'
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    if ($ownsControl) { $controlMutex.ReleaseMutex() }
    $controlMutex.Dispose()
}
