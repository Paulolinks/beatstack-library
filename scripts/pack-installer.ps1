# Gera instalador Windows (.exe) — cliente conectado ao VPS
# Atalho na area de trabalho incluido no instalador NSIS
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"

Write-Host "Gerando instalador BeatStack Library..." -ForegroundColor Cyan
npm run pack:installer

$setup = Get-ChildItem "dist-electron\BeatStack Library-Setup *.exe" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (-not $setup) {
  $setup = Get-ChildItem "dist-electron\BeatStack Library Setup *.exe" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}
if ($setup) {
  Write-Host ""
  Write-Host "Instalador pronto:" -ForegroundColor Green
  Write-Host $setup.FullName

  $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  $majorMinor = if ($pkg.version -match "^(\d+\.\d+)") { $Matches[1] } else { "current" }
  $releaseDir = Join-Path $root "releases\v$majorMinor"
  New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
  $destName = "BeatStack-Library-Setup-$($pkg.version).exe"
  Copy-Item $setup.FullName (Join-Path $releaseDir $destName) -Force
  Write-Host "Copiado para: $releaseDir\$destName" -ForegroundColor Cyan
} else {
  $portable = Join-Path $root "dist-electron\win-unpacked\BeatStack Library.exe"
  if (Test-Path $portable) {
    Write-Host "Setup falhou, mas app portatil existe:" -ForegroundColor Yellow
    Write-Host $portable
  }
}
