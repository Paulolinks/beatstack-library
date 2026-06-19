# Deploy BeatStack Library no VPS + app no PC (estilo Splice)

Este guia explica como rodar a **biblioteca central no VPS** (samples, login, admin) e usar o **app desktop no seu PC** para navegar, ouvir e copiar samples para o DAW.

## Visão geral

```text
┌─────────────────────┐         HTTPS          ┌──────────────────────────┐
│  Seu PC (Windows)   │  ◄──────────────────►  │  VPS (Ubuntu)            │
│  App Electron       │      login + API       │  Next.js + SQLite        │
│  Documents/         │                        │  storage/ (sample packs) │
│  BeatStack Library/ │                        │  Admin importa packs     │
└─────────────────────┘                        └──────────────────────────┘
```

| Onde | O que faz |
|------|-----------|
| **VPS** | Servidor web, banco, arquivos dos packs, importação admin |
| **PC** | App instalado conecta ao VPS, baixa sample na hora do "copiar", salva localmente e coloca na área de transferência |

---

## Requisitos do VPS

- Ubuntu 22.04 ou 24.04 (ou Debian similar)
- **2 GB RAM** mínimo (4 GB recomendado se importar packs grandes)
- Disco: depende dos samples (ex.: 50 GB+)
- Domínio apontando para o IP do VPS (ex.: `library.seudominio.com`)
- Portas **80** e **443** abertas

---

## Parte 1 — Instalar no VPS (Docker, recomendado)

### 1. Conectar no VPS

```bash
ssh root@SEU_IP
```

### 2. Instalar Docker

```bash
apt update && apt install -y docker.io docker-compose-v2 git
systemctl enable --now docker
```

### 3. Clonar o projeto

```bash
cd /opt
git clone https://github.com/SEU_USUARIO/beatstack-library.git
cd beatstack-library
```

### 4. Criar `.env` de produção

```bash
cp .env.example .env
nano .env
```

Conteúdo mínimo:

```env
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="gere-uma-chave-longa-aleatoria-aqui"
NODE_ENV=production
```

Gere um JWT seguro:

```bash
openssl rand -base64 48
```

**Nunca** use `AUTH_DISABLED=true` em produção.

### 5. Subir o container

```bash
docker compose up -d --build
```

### 6. Criar banco e admin

```bash
docker compose exec app npx prisma db push
docker compose exec app npm run admin:create -- admin@seudominio.com SuaSenhaForte "Admin"
```

### 7. HTTPS com Caddy (mais simples)

Instale o Caddy:

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

Crie `/etc/caddy/Caddyfile`:

```caddy
library.seudominio.com {
    reverse_proxy localhost:3000
}
```

```bash
systemctl reload caddy
```

O Caddy obtém certificado SSL automaticamente.

### 8. Testar no navegador

Abra `https://library.seudominio.com/login` e entre com o admin.

### 9. Importar sample packs (admin)

1. Login como admin
2. Vá em **Importar** (`/admin/import`)
3. Envie ZIP/RAR dos packs + capa
4. Aguarde o processamento

Os arquivos ficam persistidos em `./storage/` no host (volume Docker).

---

## Parte 1 (alternativa) — VPS sem Docker (PM2)

Se preferir rodar direto no Node:

```bash
# No VPS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

cd /opt/beatstack-library
npm ci
cp .env.example .env
# edite JWT_SECRET e DATABASE_URL

npx prisma db push
npm run build
npm run admin:create -- admin@seudominio.com senha "Admin"

PORT=3000 HOSTNAME=0.0.0.0 pm2 start .next/standalone/server.js --name beatstack
pm2 save
pm2 startup
```

Use nginx ou Caddy na frente na porta 443.

---

## Parte 2 — App no seu computador (Windows)

O app Electron **não precisa** rodar servidor local quando aponta para o VPS. Ele abre a URL remota e, ao copiar um sample, **baixa do VPS** e salva em:

```text
Documents/BeatStack Library/Downloads/{pack}/{arquivo.wav}
```

### Opção A — Variável de ambiente (rápido para testar)

Com o projeto clonado no PC:

```powershell
cd "C:\Users\paulo\Desktop\BeatStack Library"
$env:BEATSTACK_SERVER_URL = "https://library.seudominio.com"
npm run desktop
```

### Opção B — Arquivo de configuração (melhor para distribuir)

Crie o arquivo (ajuste o caminho se o usuário for outro):

```text
C:\Users\paulo\AppData\Roaming\BeatStack Library\server.json
```

Conteúdo:

```json
{
  "serverUrl": "https://library.seudominio.com"
}
```

Depois abra o app normalmente (`npm run desktop` ou o `.exe` instalado).

> O Electron lê `BEATSTACK_SERVER_URL` primeiro; se não existir, usa `server.json`.

### Opção C — Instalador `.exe` para sócios

1. No PC de build, configure a URL do VPS em `server.json` **ou** defina `BEATSTACK_SERVER_URL` antes do build
2. Gere o instalador:

```powershell
npm run pack:desktop
```

3. Distribua `dist-electron/BeatStack Library Setup x.x.x.exe`
4. Cada sócio instala, faz login com conta **aprovada** no admin do VPS

Para build **só cliente** (sem servidor embutido, instalador menor), distribua o `.exe` junto com um `server.json` pré-configurado na pasta `%APPDATA%\BeatStack Library\`.

---

## Parte 3 — Fluxo do dia a dia

1. **Você (admin)** sobe packs no VPS via `/admin/import`
2. **Sócios** abrem o app no PC → login
3. Navegam, ouvem preview, favoritam
4. Clicam em **copiar** → arquivo vai para `Documents/BeatStack Library/`
5. No DAW: arrastam o arquivo ou usam o browser de arquivos

---

## Criar usuários para sócios

No VPS, como admin:

- Interface: `https://library.seudominio.com/admin/users`
- Ou CLI:

```bash
docker compose exec app npm run admin:create -- socio@email.com senha123 "Nome do Sócio"
```

Depois **aprove** a conta na tela de usuários.

---

## Backup (importante)

Faça backup regular de:

| Item | Caminho no VPS |
|------|----------------|
| Banco SQLite | `prisma/prod.db` (ou volume Docker) |
| Sample packs | `storage/` |

Exemplo:

```bash
tar -czf beatstack-backup-$(date +%F).tar.gz storage prisma/prod.db
```

---

## Atualizar o VPS

```bash
cd /opt/beatstack-library
git pull
docker compose up -d --build
docker compose exec app npx prisma db push
```

---

## Solução de problemas

| Problema | O que verificar |
|----------|-----------------|
| App não abre / timeout | VPS online? `curl https://library.seudominio.com/login` |
| Login falha | Conta aprovada? `JWT_SECRET` igual após rebuild? |
| Copiar não salva no PC | App Electron (não navegador)? `server.json` com URL correta? |
| Import falha | Espaço em disco, limite de upload no proxy (nginx/Caddy) |
| SSL | DNS do domínio apontando para o IP? Porta 443 aberta? |

### Limite de upload (Caddy)

Para packs grandes, no Caddyfile:

```caddy
library.seudominio.com {
    request_body {
        max_size 500MB
    }
    reverse_proxy localhost:3000
}
```

---

## Resumo rápido

```powershell
# VPS
docker compose up -d --build
docker compose exec app npx prisma db push
docker compose exec app npm run admin:create -- admin@email.com senha Admin

# PC
$env:BEATSTACK_SERVER_URL = "https://library.seudominio.com"
npm run desktop
```

Pronto: biblioteca centralizada no VPS, uso local estilo Splice no PC.
