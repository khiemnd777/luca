#!/bin/bash
set -euo pipefail

echo "🚀 Boosting up..."

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GOCACHE_DIR="$ROOT_DIR/.gocache"
LOG_DIR="$ROOT_DIR/tmp/observability/logs"
LOG_FILE="$LOG_DIR/noah_api.json.log"
ENV="${APP_ENV:-development}"
OBSERVABLE="false"
EXTERNAL_OBSERVABILITY_STACK="${OBSERVABILITY_STACK_MANAGED_EXTERNALLY:-false}"

load_dotenv() {
  local env_file="$1"
  local key value

  if [ ! -f "$env_file" ]; then
    return 0
  fi

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ""|\#*)
        continue
        ;;
    esac

    key="${line%%=*}"
    value="${line#*=}"
    key="$(printf '%s' "$key" | xargs)"
    value="$(printf '%s' "$value" | xargs)"

    if [ -z "$key" ]; then
      continue
    fi

    case "$value" in
      \"*\")
        value="${value#\"}"
        value="${value%\"}"
        ;;
      \'*\')
        value="${value#\'}"
        value="${value%\'}"
        ;;
    esac

    if [ -z "${!key+x}" ]; then
      export "$key=$value"
    fi
  done < "$env_file"
}

for arg in "$@"; do
  case $arg in
    --env=*)
      ENV="${arg#*=}"
      shift
      ;;
    --observable)
      OBSERVABLE="true"
      shift
      ;;
  esac
done

ENV_FILE="$ROOT_DIR/.env"

if [ "$ENV" = "production" ] && [ -f "$ROOT_DIR/.env.prod" ]; then
  ENV_FILE="$ROOT_DIR/.env.prod"
fi

load_dotenv "$ENV_FILE"

echo "🌱 APP_ENV=$ENV"

mkdir -p "$GOCACHE_DIR"

GOFLAGS_VALUE="${GOFLAGS:--mod=mod}"
GOCACHE_VALUE="${GOCACHE:-$GOCACHE_DIR}"

if [ "$OBSERVABLE" = "true" ]; then
  if [ "$EXTERNAL_OBSERVABILITY_STACK" = "true" ]; then
    echo "🧱 Using externally managed observability stack"
  else
    echo "🧱 Starting local observability stack"
    "$ROOT_DIR/observability_up.sh"
  fi
  mkdir -p "$LOG_DIR"
  touch "$LOG_FILE"
  echo "📡 Observability log shipping enabled"
  echo "📝 Mirroring stdout/stderr to $LOG_FILE"
  APP_ENV="$ENV" GOFLAGS="$GOFLAGS_VALUE" GOCACHE="$GOCACHE_VALUE" go run main.go 2>&1 | tee -a "$LOG_FILE"
  exit ${PIPESTATUS[0]}
fi

APP_ENV="$ENV" GOFLAGS="$GOFLAGS_VALUE" GOCACHE="$GOCACHE_VALUE" go run main.go
