#!/usr/bin/env bash
# Deploy servidor de licenças BeatStack Manager — /opt/beatstack-license
set -euo pipefail

LICENSE_DIR="/opt/beatstack-license"
LIBRARY_DIR="/opt/beatstack-library"
DOMAIN="license.srv983653.hstgr.cloud"

echo "==> BeatStack Manager License Server"
echo "    Pasta: $LICENSE_DIR"
echo "    URL: https://$DOMAIN"

mkdir -p "$LICENSE_DIR"

if [[ -d "$LIBRARY_DIR" && "$LICENSE_DIR" != "$LIBRARY_DIR" ]]; then
  echo "==> Sincronizando código do Library..."
  rsync -a --delete \
    --exclude node_modules --exclude .next --exclude storage --exclude dist-electron \
    --exclude dist-electron-manager --exclude .git \
    "$LIBRARY_DIR/" "$LICENSE_DIR/"
fi

cd "$LICENSE_DIR"

if [[ ! -f .env ]]; then
  JWT=$(openssl rand -base64 48 | tr -d '\n')
  cat > .env << EOF
DATABASE_URL="file:./prisma/license.db"
JWT_SECRET="${JWT}"
NODE_ENV=production
BEATSTACK_APP_MODE=license
ADMIN_EMAILS=paulolinks16@gmail.com
EOF
fi

echo "==> Build license server..."
docker compose -p beatstack-license -f docker-compose.license.traefik.yml up -d --build

echo "==> Banco license.db..."
sleep 6
docker compose -p beatstack-license exec -T app node ./node_modules/prisma/build/index.js db push --skip-generate

VOL=/var/lib/docker/volumes/beatstack_license_db/_data
cp "$LICENSE_DIR/prisma/schema.prisma" "$VOL/schema.prisma" 2>/dev/null || true
docker compose -p beatstack-license exec -T app node ./node_modules/prisma/build/index.js db push --skip-generate

echo "==> Conta administrador / licença Paulo..."
docker compose -p beatstack-license exec -T app node scripts/enable-manager-license.cjs paulolinks16@gmail.com "@Fl123456" Paulo

echo "==> Aprovar contas Manager no Library (license.db)..."
docker compose -p beatstack-license exec -T app node scripts/approve-manager-library-users.cjs || true

echo "==> Removendo license.* do stack Library (se existir)..."
if [[ -f "$LIBRARY_DIR/docker-compose.traefik.yml" ]]; then
  cd "$LIBRARY_DIR"
  if grep -q beatstack-license docker-compose.traefik.yml 2>/dev/null; then
    sed -i '/beatstack-license/d' docker-compose.traefik.yml
    docker compose -p beatstack up -d
  fi
fi

echo ""
echo "✅ License server: https://$DOMAIN/admin/dashboard"
echo "   Login admin: paulolinks16@gmail.com"
