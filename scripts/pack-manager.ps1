# Gera instalador BeatStack Manager v2.0 (app local + licenca VPS)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
$env:BEATSTACK_APP_MODE = "manager"
$env:NEXT_PUBLIC_BEATSTACK_APP_MODE = "manager"
$env:LICENSE_SERVER_URL = "https://license.paulolinks.com"
$env:NEXT_PUBLIC_LICENSE_SERVER_URL = "https://license.paulolinks.com"
# Offline por enquanto — login/licença desligados no runtime via desktop/main.js (AUTH_DISABLED)

$configPath = Join-Path $root "electron-builder.manager.yml"
$configText = Get-Content $configPath -Raw
$version = if ($configText -match 'version:\s*"([^"]+)"') { $Matches[1] } else { "2.0.13" }
$outDir = if ($configText -match 'output:\s*(\S+)') { $Matches[1].Trim() } else { "dist-build-manager-release" }
$minSetupBytes = 100MB

Write-Host "Versao: $version | Output: $outDir" -ForegroundColor Cyan

Write-Host "Limpando builds Electron antigos (evita bundle gigante)..." -ForegroundColor Yellow
Get-ChildItem $root -Directory -Filter "dist-build-manager-release" -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem $root -Directory -Filter "dist-electron*" -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem $root -Directory -Filter "dist-build-fresh-*" -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $root ".next") -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Build BeatStack Manager (modo local)..." -ForegroundColor Cyan

Write-Host "Gerando banco template (SQLite)..." -ForegroundColor Cyan
$templateDb = Join-Path $root "scripts\manager-template.db"
Remove-Item $templateDb -Force -ErrorAction SilentlyContinue
$env:DATABASE_URL = "file:$($templateDb.Replace('\','/'))"
npx prisma db push --skip-generate
if (-not (Test-Path $templateDb)) {
  Write-Host "Falha ao gerar manager-template.db" -ForegroundColor Red
  exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "Falha no npm run build" -ForegroundColor Red
  exit 1
}

$standaloneEnv = Join-Path $root ".next\standalone\.env"
if (Test-Path $standaloneEnv) {
  Remove-Item $standaloneEnv -Force
  Write-Host "Removido .env do bundle (usa AppData no instalador)" -ForegroundColor Yellow
}

$standaloneSize = (Get-ChildItem (Join-Path $root ".next\standalone") -Recurse -File -EA SilentlyContinue |
  Measure-Object -Property Length -Sum).Sum
Write-Host "Standalone: $([math]::Round($standaloneSize / 1GB, 2)) GB" -ForegroundColor Yellow
if ($standaloneSize -gt 2GB) {
  Write-Host "AVISO: bundle standalone muito grande (>2GB). Verifique outputFileTracingExcludes." -ForegroundColor Red
}

Write-Host "Empacotando instalador..." -ForegroundColor Cyan
Get-Process -Name "BeatStack Manager","beatstack-server","electron" -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
if (Test-Path (Join-Path $root $outDir)) {
  Remove-Item (Join-Path $root $outDir) -Recurse -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 1
}
npx electron-builder --win --config electron-builder.manager.yml
if ($LASTEXITCODE -ne 0) {
  Write-Host "Falha no electron-builder (exit $LASTEXITCODE)" -ForegroundColor Red
  exit 1
}

$setup = Get-ChildItem (Join-Path $root $outDir) -Filter "*Setup*.exe" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $setup) {
  Write-Host "Setup nao encontrado em $outDir" -ForegroundColor Red
  exit 1
}

if ($setup.Length -lt $minSetupBytes) {
  Write-Host "Instalador invalido ($($setup.Length) bytes). Build incompleto." -ForegroundColor Red
  Remove-Item $setup.FullName -Force -ErrorAction SilentlyContinue
  exit 1
}

$releaseName = "BeatStack-Manager-Setup-$version.exe"
New-Item -ItemType Directory -Force -Path (Join-Path $root "releases\v2.0") | Out-Null
Copy-Item $setup.FullName (Join-Path $root "releases\v2.0\$releaseName") -Force
Write-Host ""
Write-Host "Instalador pronto ($([math]::Round($setup.Length / 1MB, 1)) MB):" -ForegroundColor Green
Write-Host $setup.FullName
Write-Host "Copiado: releases\v2.0\$releaseName" -ForegroundColor Cyan
