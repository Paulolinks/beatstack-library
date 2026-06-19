#!/usr/bin/env bash
# Instala BeatStack Library no VPS sem mexer no n8n/Traefik.
# Uso:
#   cd /opt/beatstack-library
#   bash scripts/deploy-vps.sh library.seudominio.com admin@email.com SuaSenha123

set -euo pipefail

DOMAIN="${1:-}"
ADMIN_EMAIL="${2:-}"
ADMIN_PASS="${3:-}"

if [[ -z "$DOMAIN" || -z "$ADMIN_EMAIL" || -z "$ADMIN_PASS" ]]; then
  echo ""
  echo "Uso:"
  echo "  bash scripts/deploy-vps.sh DOMINIO EMAIL SENHA"
  echo ""
  echo "Exemplo:"
  echo "  bash scripts/deploy-vps.sh library.beatstack.com.br admin@gmail.com admin123"
  echo ""
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Pasta: $ROOT"
echo "==> Domínio: $DOMAIN"
echo "==> Rede Traefik: root_default (n8n intacto)"

if ! docker ps --format '{{.Names}}' | grep -q '^root-traefik-1$'; then
  echo "⚠️  Traefik (root-traefik-1) não encontrado. Continuando mesmo assim..."
fi

if [[ ! -f package.json ]]; then
  echo "❌ package.json não encontrado. Envie os arquivos do projeto para $ROOT primeiro."
  exit 1
fi

JWT="$(openssl rand -base64 48 | tr -d '\n')"

cat > .env <<EOF
DATABASE_URL="file:./prisma/prod.db"
JWT_SECRET="${JWT}"
NODE_ENV=production
EOF

echo "==> .env criado"

COMPOSE_FILE="docker-compose.traefik.yml"
cp "$COMPOSE_FILE" "${COMPOSE_FILE}.bak"
sed -i "s|library.SEUDOMINIO.com|${DOMAIN}|g" "$COMPOSE_FILE"

echo "==> Build + start (projeto docker: beatstack)..."
docker compose -p beatstack -f "$COMPOSE_FILE" up -d --build

echo "==> Aguardando container..."
sleep 8

echo "==> Banco de dados..."
docker compose -p beatstack exec -T app npx prisma db push

echo "==> Criando admin..."
docker compose -p beatstack exec -T app npm run admin:create -- "$ADMIN_EMAIL" "$ADMIN_PASS" "Admin"

echo ""
echo "✅ Pronto!"
echo ""
echo "   URL:  https://${DOMAIN}/login"
echo "   Email: ${ADMIN_EMAIL}"
echo ""
echo "   Crie um registro DNS tipo A:"
echo "   library  →  IP do VPS"
echo "   (se ainda não criou — use o subdomínio que você passou acima)"
echo ""
echo "   No PC:"
echo '   $env:BEATSTACK_SERVER_URL = "https://'"${DOMAIN}"'"'
echo "   npm run desktop"
echo ""
echo "   Logs: docker compose -p beatstack logs -f app"
echo "   Parar só BeatStack: docker compose -p beatstack down"
echo ""
