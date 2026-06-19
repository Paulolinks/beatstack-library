# Cria o repositório no GitHub e faz push do BeatStack Library
# Pré-requisito: gh auth login (uma vez)

$ErrorActionPreference = "Stop"
$gh = "$env:LOCALAPPDATA\gh-cli\bin\gh.exe"

if (-not (Test-Path $gh)) {
    Write-Host "GitHub CLI não encontrado. Baixe em: https://cli.github.com/"
    exit 1
}

& $gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Faça login no GitHub primeiro:"
    Write-Host "  & `"$gh`" auth login"
    exit 1
}

$repoName = "beatstack-library"
Write-Host "Criando repositório $repoName no GitHub..."

& $gh repo create $repoName `
    --public `
    --source=. `
    --remote=origin `
    --description "Sample pack manager estilo Splice - BeatStack Library" `
    --push

if ($LASTEXITCODE -eq 0) {
    Write-Host "Repositório criado e código enviado com sucesso!"
    & $gh repo view --web
} else {
    Write-Host "Se o repo já existir, tente:"
    Write-Host "  git remote add origin https://github.com/SEU_USUARIO/$repoName.git"
    Write-Host "  git push -u origin main"
}
