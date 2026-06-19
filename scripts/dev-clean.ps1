# Para o servidor antigo, limpa cache e inicia de novo
$ErrorActionPreference = "SilentlyContinue"

Write-Host "Parando processos nas portas 3000 e 3001..."
Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 1

Write-Host "Limpando cache .next..."
Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue

Write-Host "Iniciando BeatStack Library..."
npm run dev
