#!/usr/bin/env bash
# Diagnóstico BeatStack no VPS — não mexe no n8n
set -euo pipefail

echo "=== Containers ==="
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|beatstack|root-n8n|root-traefik" || true

echo ""
echo "=== Labels do n8n (copie o padrão Traefik) ==="
docker inspect root-n8n-1 --format '{{range $k,$v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' | grep traefik || true

echo ""
echo "=== Labels do beatstack (se existir) ==="
docker ps -a --format '{{.Names}}' | grep beatstack | head -1 | xargs -r docker inspect --format '{{range $k,$v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' | grep traefik || echo "container beatstack nao encontrado"

echo ""
echo "=== Arquivos em /opt/beatstack-library ==="
ls -la /opt/beatstack-library/Dockerfile 2>/dev/null || echo "FALTA Dockerfile"
ls -la /opt/beatstack-library/docker-compose.traefik.yml 2>/dev/null || echo "FALTA docker-compose.traefik.yml"

echo ""
echo "=== Teste interno (porta 3000 no container) ==="
docker compose -p beatstack ps 2>/dev/null || echo "projeto beatstack nao encontrado"
CID=$(docker ps -q -f name=beatstack-app 2>/dev/null | head -1)
if [[ -n "$CID" ]]; then
  docker exec "$CID" wget -qO- http://127.0.0.1:3000/login 2>/dev/null | head -c 200 || echo "app nao responde dentro do container"
else
  echo "beatstack-app nao esta rodando"
fi

echo ""
echo "=== Logs beatstack (ultimas 30 linhas) ==="
docker compose -p beatstack logs --tail=30 app 2>/dev/null || true
