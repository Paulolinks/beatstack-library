#!/usr/bin/env bash
# Um comando só no VPS — atualiza do GitHub e instala (não mexe no n8n)
set -euo pipefail
cd /opt/beatstack-library
git pull origin main
bash scripts/vps-fix-and-deploy.sh library.srv983653.hstgr.cloud
