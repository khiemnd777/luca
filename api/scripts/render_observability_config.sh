#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$API_ROOT/.." && pwd)"
# shellcheck source=deploy/scripts/lib-env.sh
source "$REPO_ROOT/deploy/scripts/lib-env.sh"

ENV_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  if [[ "${APP_ENV:-}" == "production" && -f "$API_ROOT/.env.prod" ]]; then
    ENV_FILE="$API_ROOT/.env.prod"
  else
    ENV_FILE="$API_ROOT/.env"
  fi
fi

load_env_file "$ENV_FILE"

export LOKI_SCHEME="${LOKI_SCHEME:-http}"
export LOKI_HOST="${LOKI_HOST:-loki}"
export LOKI_PORT="${LOKI_PORT:-3100}"
export LOKI_BASE_URL="$(derive_loki_base_url)"
export OBSERVABILITY_SERVICE_NAME="${OBSERVABILITY_SERVICE_NAME:-${APP_NAME:-noah_api}}"

PROMTAIL_TEMPLATE="$API_ROOT/observability/promtail-config.yaml.tmpl"
PROMTAIL_OUTPUT="$API_ROOT/observability/promtail-config.yaml"
GRAFANA_TEMPLATE="$API_ROOT/observability/grafana/provisioning/datasources/loki.yaml.tmpl"
GRAFANA_OUTPUT="$API_ROOT/observability/grafana/provisioning/datasources/loki.yaml"

mkdir -p "$(dirname "$GRAFANA_OUTPUT")"

sed \
  -e "s|__LOKI_BASE_URL__|$LOKI_BASE_URL|g" \
  -e "s|__SERVICE_NAME__|$OBSERVABILITY_SERVICE_NAME|g" \
  "$PROMTAIL_TEMPLATE" > "$PROMTAIL_OUTPUT"

sed \
  -e "s|__LOKI_BASE_URL__|$LOKI_BASE_URL|g" \
  "$GRAFANA_TEMPLATE" > "$GRAFANA_OUTPUT"

echo "Rendered $PROMTAIL_OUTPUT"
echo "Rendered $GRAFANA_OUTPUT"
