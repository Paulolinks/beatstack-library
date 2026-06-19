# BeatStack Library — App desktop (estilo Splice)

## Como funciona

| Modo | Onde roda | Ao clicar em copiar/baixar |
|------|-----------|----------------------------|
| **App local** | `localhost` ou Electron local | Copia para `Documents/BeatStack Library/` + caminho na área de transferência |
| **App desktop + VPS** | Electron → URL remota | Baixa do VPS, salva em `Documents/BeatStack Library/` + clipboard |
| **Online (navegador)** | URL remota no Chrome | Download pelo navegador (pasta Downloads) |

## Conectar o app ao VPS (estilo Splice)

1. Suba o servidor no VPS — veja [DEPLOY-VPS.md](./DEPLOY-VPS.md)
2. No PC, aponte o Electron para a URL:

```powershell
$env:BEATSTACK_SERVER_URL = "https://library.seudominio.com"
npm run desktop
```

Ou crie `%APPDATA%\BeatStack Library\server.json`:

```json
{ "serverUrl": "https://library.seudominio.com" }
```

(Modelo em `desktop/server.json.example`.)

## Pasta local (estilo Splice)

```text
Documents/BeatStack Library/
├── Downloads/     ← samples copiados da biblioteca
├── Likes/         ← samples copiados na coleção Likes
├── Copied/        ← samples já copiados (coleção Copiados)
└── Presets/       ← pastas de presets (Serum, Vital…)
    └── {pack}/
        └── Serum Presets/
```

Cada sample fica em subpasta do pack. O caminho completo vai para a **área de transferência** — cole no browser de arquivos do DAW (FL Studio, Ableton, etc.).

## Rodar como app instalável (Electron)

### 1. Instalar dependências do desktop

```bash
npm install
npm install --save-dev electron wait-on concurrently
```

### 2. Modo desenvolvimento (janela + servidor)

```bash
npm run desktop:dev
```

Abre uma janela do app (sem precisar abrir o Chrome manualmente).

### 3. Só a janela (servidor já rodando)

```bash
npm run dev
# outro terminal:
npm run desktop
```

## Gerar instalador .exe (Windows)

```bash
npm install
npm run admin:create -- admin@seu.com senha123 Admin
npm run pack:desktop
```

O instalador sai em `dist-electron/`. O usuário instala, abre o app, faz **login** e usa a biblioteca numa janela só — igual Splice.

> Antes do primeiro build, defina `JWT_SECRET` no `.env` e rode `npm run build`.

## Login (online e desktop)

1. Admin cria usuário em `/admin/users` (ou `npm run admin:create`)
2. Usuário abre o app → tela de login
3. Só entra quem estiver **aprovado**

## Uso no DAW

1. Clique no ícone de download/copy no sample
2. Abra o DAW → browser de arquivos / importar
3. **Ctrl+V** no campo de caminho (ou navegue até `Documents/BeatStack Library/Downloads/...`)
4. Arraste o arquivo para a timeline

Igual ao fluxo do Splice Desktop.
