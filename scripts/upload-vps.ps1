# Envia o projeto para o VPS (rode no PowerShell do seu PC)
# Uso:
#   .\scripts\upload-vps.ps1 -Ip "123.456.789.0"

param(
  [Parameter(Mandatory = $true)]
  [string]$Ip
)

$local = "C:\Users\paulo\Desktop\BeatStack Library"
$remote = "/opt/beatstack-library"

Write-Host "Enviando para root@${Ip}:${remote} ..." -ForegroundColor Cyan

ssh root@$Ip "mkdir -p $remote"

scp -r "$local\*" "root@${Ip}:${remote}/"

Write-Host ""
Write-Host "OK. Agora no VPS rode:" -ForegroundColor Green
Write-Host "  cd /opt/beatstack-library"
Write-Host '  bash scripts/deploy-vps.sh library.SEUDOMINIO.com admin@email.com SuaSenha123'
Write-Host ""
