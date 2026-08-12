#requires -Version 5.1
<#
  Pixon Bluetooth Optimizer
  Safe, hardware-aware Bluetooth latency optimization for Windows 10/11.
  Run from Run-Bluetooth-Optimizer.cmd, or from an elevated PowerShell prompt.
#>
[CmdletBinding()]
param(
  [switch]$AuditOnly,
  [switch]$SkipDriverUpdate,
  [switch]$SkipWiFiTuning,
  [switch]$Restart
)

$ErrorActionPreference = 'Stop'
$toolName = 'Pixon Bluetooth Optimizer'
$reportRoot = Join-Path $env:ProgramData 'PixonBluetoothOptimizer'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $reportRoot "run-$timestamp.log"
$reportPath = Join-Path $reportRoot "report-$timestamp.json"

function Write-Log {
  param([string]$Message, [ValidateSet('INFO', 'WARN', 'ERROR')] [string]$Level = 'INFO')
  $line = "[{0}] [{1}] {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
  Write-Host $line
  Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
}

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-BluetoothDrivers {
  Get-CimInstance Win32_PnPSignedDriver |
    Where-Object { $_.DeviceClass -eq 'Bluetooth' -or $_.DeviceName -match 'Bluetooth' } |
    Select-Object DeviceName, DriverVersion, DriverDate, Manufacturer, InfName, DeviceID
}

function Install-PendingBluetoothUpdates {
  $result = [ordered]@{ Found = $false; Downloaded = $false; Installed = $false; RebootRequired = $false; Titles = @(); Error = $null }

  try {
    $session = New-Object -ComObject Microsoft.Update.Session
    $searcher = $session.CreateUpdateSearcher()
    $available = $searcher.Search("IsInstalled=0 and Type='Driver'").Updates
    $targets = New-Object -ComObject Microsoft.Update.UpdateColl

    for ($index = 0; $index -lt $available.Count; $index++) {
      $candidate = $available.Item($index)
      $isBluetooth = $candidate.DriverModel -match 'Bluetooth' -or $candidate.Title -match 'Bluetooth'
      if ($isBluetooth) {
        if (-not $candidate.EulaAccepted) { $candidate.AcceptEula() }
        [void]$targets.Add($candidate)
        $result.Titles += $candidate.Title
      }
    }

    if ($targets.Count -eq 0) { return [pscustomobject]$result }

    $result.Found = $true

    $downloader = $session.CreateUpdateDownloader()
    $downloader.Updates = $targets
    $download = $downloader.Download()
    if ($download.ResultCode -ne 2) {
      throw "Windows Update download failed (ResultCode $($download.ResultCode), HResult $($download.HResult))."
    }
    $result.Downloaded = $true

    $installer = $session.CreateUpdateInstaller()
    $installer.Updates = $targets
    $install = $installer.Install()
    if ($install.ResultCode -ne 2) {
      throw "Windows Update installation failed (ResultCode $($install.ResultCode), HResult $($install.HResult))."
    }
    $result.Installed = $true
    $result.RebootRequired = [bool]$install.RebootRequired
  }
  catch {
    $result.Error = $_.Exception.Message
  }

  [pscustomobject]$result
}

function Set-IntelWiFiCoexistence {
  $changes = @()
  $wifiAdapters = Get-NetAdapter -Physical -ErrorAction SilentlyContinue |
    Where-Object { $_.InterfaceDescription -match 'Intel.*Wi-Fi|Intel.*Wireless' }

  foreach ($adapter in $wifiAdapters) {
    $properties = Get-NetAdapterAdvancedProperty -Name $adapter.Name -AllProperties -ErrorAction SilentlyContinue
    foreach ($setting in @(
      @{ RegistryKeyword = 'RoamingPreferredBandType'; RegistryValue = 2; Description = 'Prefer 5 GHz to reduce 2.4 GHz Bluetooth contention' },
      @{ RegistryKeyword = 'ChannelWidth24'; RegistryValue = 0; Description = 'Limit 2.4 GHz Wi-Fi to 20 MHz for Bluetooth coexistence' }
    )) {
      $property = $properties | Where-Object { $_.RegistryKeyword -eq $setting.RegistryKeyword } | Select-Object -First 1
      if (-not $property) {
        $changes += [pscustomobject]@{ Adapter = $adapter.Name; Setting = $setting.RegistryKeyword; Status = 'Not supported'; Detail = $setting.Description }
        continue
      }

      try {
        Set-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword $setting.RegistryKeyword -RegistryValue $setting.RegistryValue -NoRestart -ErrorAction Stop
        $changes += [pscustomobject]@{ Adapter = $adapter.Name; Setting = $setting.RegistryKeyword; Status = 'Applied'; Detail = $setting.Description }
      }
      catch {
        $changes += [pscustomobject]@{ Adapter = $adapter.Name; Setting = $setting.RegistryKeyword; Status = 'Not changed'; Detail = $_.Exception.Message }
      }
    }
  }

  $changes
}

if (-not (Test-Administrator)) {
  $forwarded = @()
  if ($AuditOnly) { $forwarded += '-AuditOnly' }
  if ($SkipDriverUpdate) { $forwarded += '-SkipDriverUpdate' }
  if ($SkipWiFiTuning) { $forwarded += '-SkipWiFiTuning' }
  if ($Restart) { $forwarded += '-Restart' }
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" $($forwarded -join ' ')"
  $elevatedProcess = Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $arguments -Wait -PassThru
  exit $elevatedProcess.ExitCode
}

New-Item -ItemType Directory -Path $reportRoot -Force | Out-Null
New-Item -ItemType File -Path $logPath -Force | Out-Null

Write-Log "$toolName started. AuditOnly=$AuditOnly"
$before = Get-BluetoothDrivers
$bluetoothAdapters = Get-PnpDevice -Class Bluetooth -ErrorAction SilentlyContinue |
  Where-Object { $_.FriendlyName -match 'Bluetooth' } |
  Select-Object Status, FriendlyName, InstanceId

if (-not $bluetoothAdapters) {
  Write-Log 'No Bluetooth adapter was found. No driver or Wi-Fi settings were changed.' 'WARN'
  $report = [ordered]@{
    Tool = $toolName
    Timestamp = (Get-Date).ToString('o')
    Status = 'No Bluetooth adapter found'
    BluetoothAdapters = $bluetoothAdapters
  }
  $report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding UTF8
  Write-Host "Report: $reportPath"
  exit 2
}

if ($before) {
  $driverSummary = ($before | ForEach-Object { "$($_.DeviceName) $($_.DriverVersion)" }) -join '; '
  Write-Log "Detected Bluetooth driver(s): $driverSummary"
}
else {
  Write-Log 'Bluetooth hardware was detected, but Windows did not expose signed-driver metadata.' 'WARN'
}
$restorePoint = 'Not requested'
if (-not $AuditOnly) {
  try {
    Checkpoint-Computer -Description 'Pixon Bluetooth Optimizer' -RestorePointType 'MODIFY_SETTINGS'
    $restorePoint = 'Created'
    Write-Log 'System restore point created.'
  }
  catch {
    $restorePoint = "Unavailable: $($_.Exception.Message)"
    Write-Log "Restore point unavailable: $($_.Exception.Message)" 'WARN'
  }
}

$driverUpdate = $null
if ($AuditOnly) {
  $driverUpdate = [pscustomobject]@{ Found = $null; Downloaded = $false; Installed = $false; RebootRequired = $false; Titles = @(); Error = 'Audit only' }
}
elseif ($SkipDriverUpdate) {
  $driverUpdate = [pscustomobject]@{ Found = $null; Downloaded = $false; Installed = $false; RebootRequired = $false; Titles = @(); Error = 'Skipped by parameter' }
}
else {
  $driverUpdate = Install-PendingBluetoothUpdates
  if ($driverUpdate.Installed) { Write-Log "Installed: $($driverUpdate.Titles -join '; ')" }
  elseif ($driverUpdate.Found) { Write-Log "Driver update was found but not installed: $($driverUpdate.Error)" 'WARN' }
  else { Write-Log 'No matching Bluetooth driver update is currently offered by Windows Update.' }
}

$wifiChanges = @()
if (-not $AuditOnly -and -not $SkipWiFiTuning -and ($before | Where-Object { $_.Manufacturer -match 'Intel' })) {
  $wifiChanges = Set-IntelWiFiCoexistence
  foreach ($change in $wifiChanges) { Write-Log "$($change.Adapter): $($change.Setting) - $($change.Status)." }
}

$after = Get-BluetoothDrivers
$report = [ordered]@{
  Tool = $toolName
  Timestamp = (Get-Date).ToString('o')
  RestorePoint = $restorePoint
  DriverBefore = $before
  DriverAfter = $after
  DriverUpdate = $driverUpdate
  WiFiCoexistence = $wifiChanges
  BluetoothAdapters = $bluetoothAdapters
  RebootRequired = [bool]$driverUpdate.RebootRequired
}
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8

Write-Log "Report saved: $reportPath"
if ($driverUpdate.RebootRequired) {
  Write-Log 'A restart is required to complete the Bluetooth driver update.' 'WARN'
  if ($Restart) {
    Write-Log 'Restart requested. Windows will restart in 10 seconds.'
    Start-Sleep -Seconds 10
    Restart-Computer -Force
  }
}

Write-Host ''
Write-Host 'Optimization complete.' -ForegroundColor Green
Write-Host "Log:    $logPath"
Write-Host "Report: $reportPath"
if ($driverUpdate.RebootRequired -and -not $Restart) {
  Write-Host 'Restart Windows to finish activating the Bluetooth driver.' -ForegroundColor Yellow
}
