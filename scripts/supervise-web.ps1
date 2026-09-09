param([switch]$Stop)

$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$hash = [System.Security.Cryptography.SHA256]::Create()
$key = ([BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($projectDir.ToLowerInvariant())))).Replace('-', '')
$hash.Dispose()
$eventName = "Local\PixonWebStop-$key"
if ($Stop) {
    try {
        $stopEvent = [Threading.EventWaitHandle]::OpenExisting($eventName)
        $stopEvent.Set() | Out-Null
        $stopEvent.Dispose()
        Write-Host 'Apagado solicitado.'
    } catch [Threading.WaitHandleCannotBeOpenedException] {
        Write-Host 'El supervisor ya esta apagado.'
    }
    exit
}

$mutex = New-Object Threading.Mutex($false, "Local\PixonWeb-$key")
$ownsMutex = $false
$children = @{}
try {
    try { $ownsMutex = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (-not $ownsMutex) { exit }
    $stopEvent = New-Object Threading.EventWaitHandle($false, [Threading.EventResetMode]::ManualReset, $eventName)
    $logDir = Join-Path $projectDir 'logs'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $env:NODE_ENV = 'production'
    $env:PORT = '3000'
    $services = @(
        @{ Name = 'server'; File = (Get-Command node.exe).Source; Arguments = ('"' + (Join-Path $projectDir 'server\server.js') + '"'); Health = 'http://127.0.0.1:3000/api/health' },
        @{ Name = 'tunnel'; File = (Get-Command cloudflared.exe).Source; Arguments = 'tunnel --metrics 127.0.0.1:20241 run pixon-tunel'; Health = 'http://127.0.0.1:20241/ready' }
    )
    $failures = @{}
    $lastCheck = @{}
    while (-not $stopEvent.WaitOne(0)) {
        foreach ($service in $services) {
            if ($stopEvent.WaitOne(0)) { break }
            $child = $children[$service.Name]
            if ($child -and -not $child.HasExited) {
                if (((Get-Date) - $lastCheck[$service.Name]).TotalSeconds -ge 10) {
                    $lastCheck[$service.Name] = Get-Date
                    try {
                        $response = Invoke-WebRequest $service.Health -UseBasicParsing -TimeoutSec 3
                        if ($response.StatusCode -ne 200) { throw 'HTTP no saludable' }
                        if ($service.Name -eq 'server' -and ($response.Content | ConvertFrom-Json).ok -ne $true) { throw 'API no saludable' }
                        $failures[$service.Name] = 0
                    } catch {
                        $failures[$service.Name]++
                        if ($failures[$service.Name] -ge 3) {
                            Add-Content -LiteralPath (Join-Path $logDir 'supervisor.log') -Value "$(Get-Date -Format o) $($service.Name) sin responder; reiniciando PID $($child.Id)"
                            Stop-Process -Id $child.Id -Force -ErrorAction SilentlyContinue
                        }
                    }
                }
                continue
            }
            if ($child) {
                Add-Content -LiteralPath (Join-Path $logDir 'supervisor.log') -Value "$(Get-Date -Format o) $($service.Name) detenido; reiniciando"
                $child.Dispose()
            }
            $children.Remove($service.Name)
            try {
                $children[$service.Name] = Start-Process -FilePath $service.File -ArgumentList $service.Arguments -WorkingDirectory $projectDir -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir "$($service.Name).out.log") -RedirectStandardError (Join-Path $logDir "$($service.Name).err.log")
                $failures[$service.Name] = 0
                $lastCheck[$service.Name] = Get-Date
                Add-Content -LiteralPath (Join-Path $logDir 'supervisor.log') -Value "$(Get-Date -Format o) $($service.Name) iniciado: PID $($children[$service.Name].Id)"
            } catch {
                Add-Content -LiteralPath (Join-Path $logDir 'supervisor.log') -Value "$(Get-Date -Format o) $($service.Name): $_"
            }
        }
        # Espera interrumpible; limita los reintentos si un servicio falla al arrancar.
        if ($stopEvent.WaitOne(3000)) { break }
    }
} finally {
    foreach ($child in $children.Values) {
        if (-not $child.HasExited) { Stop-Process -Id $child.Id -Force -ErrorAction SilentlyContinue }
        $child.Dispose()
    }
    if ($stopEvent) { $stopEvent.Dispose() }
    if ($ownsMutex) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
