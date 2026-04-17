#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
REPO_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
# shellcheck source=deploy/scripts/lib-env.sh
source "$REPO_ROOT/deploy/scripts/lib-env.sh"

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "docker compose is required but not found."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "docker daemon is not running. Please start Docker Desktop or dockerd first."
  exit 1
fi

ENV_FILE="$ROOT_DIR/.env"

if [[ "${APP_ENV:-}" == "production" && -f "$ROOT_DIR/.env.prod" ]]; then
  ENV_FILE="$ROOT_DIR/.env.prod"
fi

load_env_file "$ENV_FILE" false
"$ROOT_DIR/scripts/render_observability_config.sh" --env-file "$ENV_FILE"

mkdir -p \
  "$ROOT_DIR/tmp/observability/logs" \
  "$ROOT_DIR/tmp/observability/loki" \
  "$ROOT_DIR/tmp/observability/promtail" \
  "$ROOT_DIR/tmp/observability/grafana"

touch "$ROOT_DIR/tmp/observability/logs/noah_api.json.log"

"${COMPOSE_CMD[@]}" --env-file "$ENV_FILE" -f "$ROOT_DIR/docker-compose.observability.yml" up -d

echo "Observability stack is running."
echo "Grafana: http://127.0.0.1:3001 (admin/admin)"
echo "Loki host port: ${LOKI_HOST_PORT:-3100}"
echo "Loki health: http://127.0.0.1:${LOKI_HOST_PORT:-3100}/ready"
