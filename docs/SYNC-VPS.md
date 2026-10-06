# Enviar packs locais para o VPS

Quando você importou packs no **PC local** e quer usá-los no **BeatStack Library na nuvem**, use a sincronização em vez do upload pelo navegador.

## Por que não usar o Import no site do VPS?

O upload pelo navegador carrega o arquivo inteiro na memória do Chrome. Packs de 500 MB–1 GB+ falham ou travam. O **Sync VPS** compacta no disco e envia pelo servidor Node — muito mais estável.

## Como usar

1. Abra o BeatStack Library **localmente** (`npm run dev` ou app desktop **sem** URL remota no `server.json`).
2. Faça login como **admin**.
3. Menu **Admin → Sync VPS** (ou `/admin/sync-vps`).
4. Informe URL do VPS, e-mail e senha admin → **Salvar conexão**.
5. A tabela mostra **Só local** vs **No VPS**.
6. Marque os packs ou clique **Enviar todos pendentes**.
7. Deixe o app aberto — envia **um pack por vez** (zip → upload → import no VPS).

## Requisitos

- Packs já importados na pasta `storage/packs/` deste PC.
- Conta admin aprovada no VPS.
- No VPS, Traefik com limite de body ≥ tamanho do maior pack (já ajustado para 10 GB em `docker-compose.traefik.yml`).

## Após atualizar o Traefik no VPS

```bash
cd /opt/beatstack-library
docker compose -p beatstack -f docker-compose.traefik.yml up -d
```

## Configuração salva

Credenciais ficam em `storage/sync-vps.config.json` (gitignored). Só no seu PC.

## Manager (75 packs no AppData)

Seus packs estão no **BeatStack Manager** local:

- Banco: `%APPDATA%\\beatstack-manager\\manager.db`
- Arquivos: `%APPDATA%\\beatstack-manager\\storage\\packs\\`

1. Abra o **BeatStack Manager** (app desktop local)
2. **Admin → Sync VPS** ou **Gerenciar packs**
3. Configure URL + login do VPS Library
4. **Enviar todos pendentes** — começa pelo pack menor

CLI (opcional):

```powershell
$env:SYNC_VPS_URL="https://library.srv983653.hstgr.cloud"
$env:SYNC_VPS_EMAIL="admin@email.com"
$env:SYNC_VPS_PASSWORD="sua-senha"
$env:DATABASE_URL="file:$env:APPDATA/beatstack-manager/manager.db"
$env:BEATSTACK_STORAGE_ROOT="$env:APPDATA/beatstack-manager/storage"
$env:BEATSTACK_ALLOW_VPS_SYNC="true"
npx tsx scripts/sync-vps-cli.ts --test
npx tsx scripts/sync-vps-cli.ts --all
```

## Indicadores na biblioteca

- **Nuvem** (verde) — pack já está no VPS
- **Local** (âmbar) — só no PC; botão **Enviar VPS** na capa ou em Gerenciar packs

Depois que os packs estão no VPS, configure o app desktop com:

```json
{ "serverUrl": "https://library.seudominio.com" }
```

em `%APPDATA%\BeatStack Library\server.json` — aí o Library usa a nuvem em qualquer máquina.
