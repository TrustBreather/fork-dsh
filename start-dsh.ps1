[CmdletBinding()]
param(
  [switch]$Build,
  [switch]$RestartDsh,
  [string]$BackendRoot = ''
)

$ErrorActionPreference = 'Stop'

$dshRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $nodeCommand) {
  throw 'Node.js is not on PATH. Install the supported Node.js version before starting DSH.'
}
$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
if ($null -eq $pnpmCommand) {
  throw 'pnpm is not on PATH. Run corepack enable or install pnpm before starting DSH.'
}

$backendRootPath = $BackendRoot
if ([string]::IsNullOrWhiteSpace($backendRootPath)) {
  $backendRootPath = $env:BACKEND_OS_ROOT
}
if ([string]::IsNullOrWhiteSpace($backendRootPath)) {
  $backendRootPath = Join-Path (Split-Path -Parent $dshRoot) 'backend-os-kernel-integrated'
}
try {
  $backendRootPath = (Resolve-Path -LiteralPath $backendRootPath -ErrorAction Stop).Path
} catch {
  throw "BackendOS root not found: $backendRootPath. Set BACKEND_OS_ROOT or pass -BackendRoot."
}
$backendEnvPath = Join-Path $backendRootPath '.env'
$patchPath = Join-Path $dshRoot 'backend-os.patch.yml'

function Get-ListeningProcessId {
  param([int]$Port)

  $connection = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($connection) { return [int]$connection.OwningProcess }
  return $null
}

if (-not (Test-Path -LiteralPath $backendEnvPath)) {
  throw "BackendOS environment file not found: $backendEnvPath"
}
if (-not (Test-Path -LiteralPath $patchPath)) {
  throw "DSH overlay not found: $patchPath"
}

$tokenLine = Get-Content -LiteralPath $backendEnvPath |
  Where-Object { $_ -match '^\s*(?:export\s+)?GPT_AGENT_TOKEN\s*=' } |
  Select-Object -Last 1
$apiKey = ''
if ($tokenLine -and $tokenLine -match '^\s*(?:export\s+)?GPT_AGENT_TOKEN\s*=\s*(.*?)\s*$') {
  $apiKey = $Matches[1].Trim()
  if (($apiKey.StartsWith('"') -and $apiKey.EndsWith('"')) -or
      ($apiKey.StartsWith("'") -and $apiKey.EndsWith("'"))) {
    $apiKey = $apiKey.Substring(1, $apiKey.Length - 2)
  }
}
if ([string]::IsNullOrWhiteSpace($apiKey)) {
  throw "GPT_AGENT_TOKEN is missing or empty in $backendEnvPath"
}

# Use the same credential source as BackendOS and keep the value out of this launcher file.
$env:BACKEND_OS_API_KEY = $apiKey

$dshProcessId = Get-ListeningProcessId -Port 3080
if ($dshProcessId) {
  $dshProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $dshProcessId"
  if ($null -eq $dshProcess -or $dshProcess.CommandLine -notmatch 'apps[\\/]cli[\\/]src[\\/]bin\.ts web') {
    throw "Port 3080 is occupied by an unrelated process (PID $dshProcessId)"
  }

  if ($RestartDsh) {
    Write-Host "Restarting DSH on port 3080 (PID $dshProcessId) ..."
    Stop-Process -Id $dshProcessId -Force
    Start-Sleep -Seconds 1
    $dshProcessId = Get-ListeningProcessId -Port 3080
  }
}

if (-not $dshProcessId) {
  if ($Build) {
    Write-Host 'Starting DSH with build and BackendOS overlay ...'
    $dshCommand = "Set-Location -LiteralPath '$dshRoot'; pnpm run dev:web -- --patch .\backend-os.patch.yml"
  } else {
    Write-Host 'Starting DSH without build with BackendOS overlay ...'
    $dshCommand = "Set-Location -LiteralPath '$dshRoot'; pnpm run start:web -- --patch .\backend-os.patch.yml"
  }

  Start-Process -FilePath 'powershell.exe' `
    -WorkingDirectory $dshRoot `
    -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $dshCommand) |
    Out-Null
} else {
  Write-Host "DSH is already running on port 3080 (PID $dshProcessId)."
  Write-Host 'Use -RestartDsh to replace it with the selected build mode.'
}

Write-Host ''
Write-Host 'BackendOS: start it separately on http://127.0.0.1:3210'
Write-Host 'DSH:       http://127.0.0.1:3080'
