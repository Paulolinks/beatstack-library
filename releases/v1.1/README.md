# BeatStack Library — Instalador v1.1.0

Versão **1.1**: cliente Electron + **sessão única** (1 computador logado por vez).

## Arquivo

- `BeatStack-Library-Setup-1.1.0.exe` — instalador Windows (NSIS)

## Novidades vs v1.0

- Login invalida sessões anteriores no mesmo e-mail
- App verifica sessão a cada ~45s e redireciona ao login se outro PC entrou
- Webhook `/api/webhooks/register-user` para cadastro automático pós-pagamento

Ver: [docs/CADASTRO-USUARIOS.md](../../docs/CADASTRO-USUARIOS.md)

## Regenerar

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run pack:installer
Copy-Item "dist-electron\BeatStack Library-Setup-1.1.0.exe" "releases\v1.1\" -Force
```
