# Abre o BeatStack Library como app desktop (janela Electron + login)
$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "Parando processos na porta 3000..."
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 1

Write-Host ""
Write-Host "BeatStack Library — modo desktop"
Write-Host "Login de teste: admin@gmail.com / admin123"
Write-Host ""

npm run desktop:dev
