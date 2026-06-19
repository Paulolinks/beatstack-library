# Deploy no VPS com Traefik + n8n (sem interferir no que já existe)

Use este guia se o VPS **já tem** Traefik (portas 80/443) e n8n rodando.

## Princípios (o que NÃO vamos fazer)

- Não editar `/root/docker-compose.yml` do n8n
- Não parar containers `root-traefik-1` nem `root-n8n-1`
- Não usar a porta 3000 no host (evita conflito)
- Projeto Docker **separado** com nome `beatstack` (volumes e rede próprios)

---

## Passo 1 — Só inspecionar (nada muda)

No VPS:

```bash
docker ps
docker network ls
docker inspect root-traefik-1 --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }} {{ end }}'
docker inspect root-n8n-1 --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }} {{ end }}'
```

Anote o nome da **rede compartilhada** entre Traefik e n8n (ex.: `root_default`).

Opcional — ver labels/resolvers do Traefik:

```bash
docker inspect root-traefik-1 | grep -i certresolver
ls /root/
cat /root/docker-compose.yml
```

> O erro `-bash: /root/.cargo/env: No such file or directory` é inofensivo; pode ignorar.

---

## Passo 2 — Pasta isolada

```bash
mkdir -p /opt/beatstack-library
cd /opt/beatstack-library
```

Envie o código **sem tocar no n8n**:

**Opção A — Git**

```bash
git clone https://github.com/SEU_USUARIO/beatstack-library.git .
```

**Opção B — Do seu PC (PowerShell)**

```powershell
scp -r "C:\Users\paulo\Desktop\BeatStack Library\*" root@SEU_IP:/opt/beatstack-library/
```

---

## Passo 3 — Arquivo `.env`

```bash
cd /opt/beatstack-library
cp .env.example .env
nano .env
```

```env
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="COLE_AQUI_CHAVE_GERADA"
NODE_ENV=production
```

Gerar chave:

```bash
openssl rand -base64 48
```

---

## Passo 4 — Ajustar Traefik overlay

Edite `docker-compose.traefik.yml`:

1. Troque `library.SEUDOMINIO.com` pelo seu subdomínio real (ex.: `library.beatstack.com`)
2. Troque `root_default` em `networks.traefik_public.name` se o passo 1 mostrou outro nome
3. Se o cert resolver não for `letsencrypt`, ajuste a label `tls.certresolver=` conforme seu Traefik

---

## Passo 5 — Subir só o BeatStack (projeto separado)

```bash
cd /opt/beatstack-library
docker compose -p beatstack -f docker-compose.traefik.yml up -d --build
```

Verifique — deve aparecer **apenas** containers `beatstack-*`, n8n intacto:

```bash
docker ps
```

---

## Passo 6 — Banco e admin

```bash
docker compose -p beatstack exec app npx prisma db push
docker compose -p beatstack exec app npm run admin:create -- admin@seuemail.com SuaSenhaForte "Admin"
```

---

## Passo 7 — DNS

No painel do domínio, crie um registro **A**:

| Tipo | Nome | Valor |
|------|------|-------|
| A | `library` | IP do VPS |

(O mesmo IP que já aponta pro n8n.)

Aguarde alguns minutos. O Traefik emite o SSL automaticamente.

---

## Passo 8 — Testar

```bash
curl -I https://library.seudominio.com/login
```

No navegador: login → `/admin/import` → subir um pack de teste.

Confirme que o n8n ainda abre normalmente na URL dele.

---

## Passo 9 — App no seu PC

```powershell
$env:BEATSTACK_SERVER_URL = "https://library.seudominio.com"
cd "C:\Users\paulo\Desktop\BeatStack Library"
npm run desktop
```

Ou `%APPDATA%\BeatStack Library\server.json` com `"serverUrl": "https://library.seudominio.com"`.

---

## Comandos úteis (só BeatStack)

```bash
cd /opt/beatstack-library

# Ver logs
docker compose -p beatstack logs -f app

# Parar só o BeatStack
docker compose -p beatstack down

# Atualizar
git pull
docker compose -p beatstack -f docker-compose.traefik.yml up -d --build
docker compose -p beatstack exec app npx prisma db push
```

`docker compose -p beatstack down` **não** remove Traefik nem n8n.

---

## Se algo der errado com o Traefik

Suba **sem** expor porta pública — só localhost para teste interno:

```bash
docker compose -p beatstack up -d --build
```

Isso publica `127.0.0.1:3000` no host. Teste no VPS:

```bash
curl http://127.0.0.1:3000/login
```

Depois configure a rota no Traefik manualmente (file provider) apontando para `http://beatstack-app-1:3000` ou `http://127.0.0.1:3000`.

---

## Backup (só BeatStack)

```bash
docker run --rm -v beatstack_beatstack_storage:/storage -v beatstack_beatstack_db:/db \
  -v $(pwd):/backup alpine tar -czf /backup/beatstack-backup.tar.gz -C / storage -C /db .
```

(Volumes têm prefixo `beatstack_` por causa do `-p beatstack`.)
