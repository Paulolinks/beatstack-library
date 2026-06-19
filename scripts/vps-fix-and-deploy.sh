#!/usr/bin/env bash
# Instala/reinstala BeatStack no VPS — NÃO mexe no n8n (/root/docker-compose.yml)
set -euo pipefail

DOMAIN="${1:-library.srv983653.hstgr.cloud}"
DIR="/opt/beatstack-library"

echo "==> BeatStack em $DIR | domínio: $DOMAIN"
echo "==> n8n/Traefik em /root — não serão alterados"

cd "$DIR"

if [[ ! -f Dockerfile ]]; then
  echo "==> Criando Dockerfile..."
  cat > Dockerfile << 'DOCKEREOF'
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/package.json ./package.json
RUN mkdir -p storage prisma
EXPOSE 3000
CMD ["node", "server.js"]
DOCKEREOF
fi

# Copia labels Traefik do n8n (mesmo certresolver/entrypoints)
N8N_LABELS=$(docker inspect root-n8n-1 --format '{{range $k,$v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' 2>/dev/null || true)
ENTRYPOINT="web,websecure"
CERT="${CERT:-mytlschallenge}"

echo "==> Traefik entrypoint: $ENTRYPOINT | certresolver: $CERT | network: root_default"

cat > docker-compose.traefik.yml << EOF
services:
  app:
    build: .
    restart: unless-stopped
    env_file:
      - .env
    environment:
      NODE_ENV: production
      HOSTNAME: 0.0.0.0
      PORT: 3000
      DATABASE_URL: "file:/app/prisma/prod.db"
    volumes:
      - beatstack_storage:/app/storage
      - beatstack_db:/app/prisma
    networks:
      - beatstack_internal
      - traefik_public
    labels:
      - traefik.enable=true
      - traefik.docker.network=root_default
      - traefik.http.middlewares.beatstack-large.buffering.maxRequestBodyBytes=1610612736
      - traefik.http.routers.beatstack.middlewares=beatstack-large@docker
      - traefik.http.routers.beatstack.rule=Host(\`${DOMAIN}\`)
      - traefik.http.routers.beatstack.entrypoints=${ENTRYPOINT}
      - traefik.http.routers.beatstack.tls=true
      - traefik.http.routers.beatstack.tls.certresolver=${CERT}
      - traefik.http.services.beatstack.loadbalancer.server.port=3000

networks:
  beatstack_internal:
    name: beatstack_internal
  traefik_public:
    external: true
    name: root_default

volumes:
  beatstack_storage:
    name: beatstack_storage
  beatstack_db:
    name: beatstack_db
EOF

JWT=$(openssl rand -base64 48 | tr -d '\n')
cat > .env << EOF
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="${JWT}"
NODE_ENV=production
EOF

echo "==> Build (pode demorar 5-10 min)..."
docker compose -p beatstack -f docker-compose.traefik.yml up -d --build

echo "==> Banco..."
sleep 5
docker compose -p beatstack exec -T app npx prisma@5.22.0 db push

echo "==> Admin (pule se já existir)..."
docker compose -p beatstack exec -T app npx tsx@4.22.4 scripts/create-admin.ts admin@gmail.com admin123 Admin || true

echo ""
echo "✅ Feito. Teste: https://${DOMAIN}/login"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "beatstack|n8n|traefik"
