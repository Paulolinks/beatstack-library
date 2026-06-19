# BeatStack Library — Instalador v1.0.0

Versão **1.0** (tag Git `v1.0.0`): cliente Electron conectado ao VPS, **sem** sessão única por computador.

## Arquivo

- `BeatStack-Library-Setup-1.0.0.exe` — instalador Windows (NSIS)

## Código correspondente

```bash
git checkout v1.0.0
```

Commit base: instalador cliente VPS, login com JWT de 30 dias, múltiplos PCs simultâneos permitidos.

## Regenerar (opcional)

Na tag `v1.0.0`:

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run pack:installer
```
