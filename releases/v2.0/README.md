# BeatStack Manager — instalador local v2.0

Gerenciador de packs **no seu PC** (sem biblioteca na nuvem).

## Gerar instalador

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run pack:manager
```

Arquivo: `dist-build-manager-release/BeatStack Manager-Setup-2.0.21.exe`  
Cópia em: `releases/v2.0/BeatStack-Manager-Setup-2.0.21.exe`

## Diferença vs BeatStack Library

| | Library (v1/v1.1) | Manager (v2) |
|--|-------------------|--------------|
| Packs | VPS online | Seus arquivos locais |
| Login | Conta na nuvem | Licença online (1 PC por vez) |
| Favoritos | Likes na nuvem | Copia para `Documents/BeatStack Manager/Favoritos/` |
| Pastas | — | Aliens, Hip-hop, etc. |

## Licença

Login valida no VPS (`library.srv983653.hstgr.cloud`). Mesmo e-mail/senha da compra.  
Só **1 computador logado por vez** — igual ao Library v1.1.
