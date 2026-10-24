[CmdletBinding()]
param(
  [switch]$NoStart,
  [switch]$SkipInstall,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$dshRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$manifestPath = Join-Path $dshRoot 'package.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$expectedNodeDescription = 'Node.js 22.19+ or 24+'
$expectedPnpm = ([string]$manifest.packageManager).Substring(5)

function Get-CommandPath {
  param([Parameter(Mandatory)][string]$Name)

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -eq $command) { return $null }
  return $command.Source
}

function Get-ToolVersion {
  param(
    [Parameter(Mandatory)][string]$CommandPath,
    [string[]]$PrefixArguments = @()
  )

  $version = (& $CommandPath @PrefixArguments '--version' 2>$null).Trim()
  if ($LASTEXITCODE -ne 0) { return $null }
  return $version
}

function Invoke-Pnpm {
  param([Parameter(Mandatory)][string[]]$Arguments)

  $callArguments = @($pnpmPrefix) + @($Arguments)
  & $pnpmPath @callArguments
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm command failed with exit code ${LASTEXITCODE}: pnpm $($Arguments -join ' ')"
  }
}

if ($manifest.packageManager -notmatch '^pnpm@[^@]+$') {
  throw "package.json must declare an exact pnpm packageManager; found $($manifest.packageManager)"
}

$nodePath = Get-CommandPath -Name 'node'
if ($null -eq $nodePath) {
  throw "Node.js is not on PATH. Install $expectedNodeDescription, then run setup-dsh.bat again."
}

$nodeVersionText = Get-ToolVersion -CommandPath $nodePath -PrefixArguments @()
if ($null -eq $nodeVersionText -or $nodeVersionText -notmatch '^v(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)') {
  throw "Could not read the Node.js version from $nodePath."
}

$nodeMajor = [int]$Matches.major
$nodeMinor = [int]$Matches.minor
$nodeSupported = ($nodeMajor -eq 22 -and $nodeMinor -ge 19) -or $nodeMajor -ge 24
if (-not $nodeSupported) {
  throw "Unsupported Node.js version $nodeVersionText. Install $expectedNodeDescription."
}

$pnpmPath = Get-CommandPath -Name 'pnpm'
$pnpmPrefix = @()
$pnpmVersion = $null
if ($null -ne $pnpmPath) {
  $pnpmVersion = Get-ToolVersion -CommandPath $pnpmPath -PrefixArguments @()
}

if ($pnpmVersion -ne $expectedPnpm) {
  $corepackPath = Get-CommandPath -Name 'corepack'
  if ($null -eq $corepackPath) {
    if ($null -eq $pnpmVersion) {
      throw "pnpm is not on PATH. Enable Corepack or install pnpm $expectedPnpm, then run setup-dsh.bat again."
    }
    throw "This checkout requires pnpm $expectedPnpm, but PATH provides pnpm $pnpmVersion."
  }

  $pnpmPath = $corepackPath
  $pnpmPrefix = @('pnpm')
  $pnpmVersion = Get-ToolVersion -CommandPath $pnpmPath -PrefixArguments $pnpmPrefix
}

if ($pnpmVersion -ne $expectedPnpm) {
  throw "This checkout requires pnpm $expectedPnpm, but the available Corepack/pnpm version is $pnpmVersion."
}

Push-Location $dshRoot
try {
  Write-Host "Using Node.js $nodeVersionText and pnpm $pnpmVersion."
  if (-not $SkipInstall) {
    Write-Host 'Installing the frozen workspace dependency graph ...'
    Invoke-Pnpm -Arguments @('install', '--frozen-lockfile')
  }

  if (-not $SkipBuild) {
    Write-Host 'Building DSH host, client, desktop, and Web artifacts ...'
    Invoke-Pnpm -Arguments @('run', 'build')
  }

  if ($NoStart) {
    Write-Host 'DSH setup complete. Start the ordinary Web UI with: pnpm dsh web'
  } else {
    Write-Host 'Starting the ordinary DSH Web UI. BackendOS is not required.'
    Invoke-Pnpm -Arguments @('dsh', 'web')
  }
} finally {
  Pop-Location
}
