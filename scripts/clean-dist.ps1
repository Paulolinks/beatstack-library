# Remove pastas dist-* (artefatos de build do electron-builder).
# Feche o BeatStack Manager antes de executar.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Get-Process -ErrorAction SilentlyContinue |
  Where-Object { $_.ProcessName -match 'BeatStack|beatstack' } |
  ForEach-Object {
    Write-Host "Encerrando $($_.ProcessName) (PID $($_.Id))..."
    Stop-Process -Id $_.Id -Force
  }
Start-Sleep -Seconds 2

$empty = Join-Path $env:TEMP "beatstack-empty-$(Get-Random)"
New-Item -ItemType Directory -Path $empty -Force | Out-Null

Get-ChildItem $root -Directory | Where-Object { $_.Name -match '^dist-' } | ForEach-Object {
  Write-Host "Removendo $($_.Name)..."
  robocopy $empty $_.FullName /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS | Out-Null
  Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
  if (Test-Path $_.FullName) {
    Write-Warning "Nao foi possivel remover $($_.Name). Feche apps que usam o projeto e tente de novo."
  } else {
    Write-Host "OK: $($_.Name)"
  }
}

Remove-Item $empty -Force -ErrorAction SilentlyContinue
Write-Host "Limpeza concluida."
