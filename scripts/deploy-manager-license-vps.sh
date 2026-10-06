#!/usr/bin/env bash
# Atualiza VPS com licença Manager + subdomínio license.*
set -euo pipefail

LIB_DIR="/opt/beatstack-library"
LIC_DIR="/opt/beatstack-license"
DOMAIN_LIBRARY="${DOMAIN_LIBRARY:-library.srv983653.hstgr.cloud}"
DOMAIN_LICENSE="${DOMAIN_LICENSE:-license.srv983653.hstgr.cloud}"

echo "==> BeatStack Manager License — deploy"
echo "    Library: $DOMAIN_LIBRARY"
echo "    License: $DOMAIN_LICENSE"

mkdir -p "$LIC_DIR"
cp -f "$LIB_DIR/deploy/license-server/README.md" "$LIC_DIR/README.md" 2>/dev/null || true

cd "$LIB_DIR"

echo "==> Build Docker..."
docker compose -p beatstack -f docker-compose.traefik.yml up -d --build

echo "==> Schema (managerLicensed)..."
sleep 5
docker compose -p beatstack exec -T app node ./node_modules/prisma/build/index.js db push --skip-generate
docker compose -p beatstack exec -T app node scripts/migrate-prod-db.cjs || true

echo "==> Ativar licença Manager — paulolinks16@gmail.com"
docker compose -p beatstack exec -T app node scripts/enable-manager-license.cjs paulolinks16@gmail.com "@Fl123456"

echo "==> Aprovar contas Manager no Library..."
docker compose -p beatstack exec -T app node scripts/approve-manager-library-users.cjs || true

echo ""
echo "✅ Licença Manager pronta"
echo "   Admin: https://${DOMAIN_LICENSE}/admin/manager-licenses"
echo "   Login teste: paulolinks16@gmail.com"
