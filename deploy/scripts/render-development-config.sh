#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ROOT_ENV="$REPO_ROOT/.env"
ROOT_ENV_SAMPLE="$REPO_ROOT/.env.sample"
API_ENV="$REPO_ROOT/api/.env"
API_ENV_SAMPLE="$REPO_ROOT/api/.env.sample"
FE_ENV="$REPO_ROOT/fe/.env"
FE_ENV_SAMPLE="$REPO_ROOT/fe/.env.sample"

copy_sample_if_missing() {
  local sample_file="$1"
  local target_file="$2"

  if [[ -f "$target_file" ]]; then
    return 0
  fi

  if [[ ! -f "$sample_file" ]]; then
    echo "Missing sample env file: $sample_file" >&2
    return 1
  fi

  cp "$sample_file" "$target_file"
  echo "Created ${target_file#$REPO_ROOT/} from ${sample_file#$REPO_ROOT/}"
}

get_env_value() {
  local file="$1"
  local key="$2"
  local line value

  if [[ ! -f "$file" ]]; then
    return 0
  fi

  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return 0
  fi

  value="${line#*=}"
  value="${value%%#*}"
  value="${value%"${value##*[![:space:]]}"}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

has_env_key() {
  local file="$1"
  local key="$2"

  [[ -f "$file" ]] && grep -Eq "^[[:space:]]*(export[[:space:]]+)?${key}=" "$file"
}

append_missing_env() {
  local file="$1"
  local key="$2"
  local value="$3"

  if has_env_key "$file" "$key"; then
    return 0
  fi

  printf '\n%s=%s\n' "$key" "$value" >> "$file"
  echo "Added ${key} to ${file#$REPO_ROOT/}"
}

port_from_origin() {
  local origin="$1"

  if [[ "$origin" =~ :([0-9]+)(/.*)?$ ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
    return 0
  fi

  if [[ "$origin" =~ ^https:// ]]; then
    printf '443'
    return 0
  fi

  printf '80'
}

copy_sample_if_missing "$ROOT_ENV_SAMPLE" "$ROOT_ENV"
copy_sample_if_missing "$API_ENV_SAMPLE" "$API_ENV"
copy_sample_if_missing "$FE_ENV_SAMPLE" "$FE_ENV"

api_port="$(get_env_value "$API_ENV" PORT)"
api_port="${api_port:-7998}"

root_fe_origin="$(get_env_value "$ROOT_ENV" APP_FE_ORIGIN)"
api_frontend_host_port="$(get_env_value "$API_ENV" FRONTEND_HOST_PORT)"
frontend_host_port="${api_frontend_host_port:-}"

if [[ -z "$frontend_host_port" && -n "$root_fe_origin" ]]; then
  frontend_host_port="$(port_from_origin "$root_fe_origin")"
fi

frontend_host_port="${frontend_host_port:-5173}"
frontend_container_port="$(get_env_value "$API_ENV" FRONTEND_CONTAINER_PORT)"
frontend_container_port="${frontend_container_port:-$frontend_host_port}"

append_missing_env "$ROOT_ENV" APP_FE_ORIGIN "http://localhost:${frontend_host_port}"

append_missing_env "$API_ENV" APP_ENV docker
append_missing_env "$API_ENV" FRONTEND_HOST_PORT "$frontend_host_port"
append_missing_env "$API_ENV" FRONTEND_CONTAINER_PORT "$frontend_container_port"

append_missing_env "$FE_ENV" VITE_BASE_ADDRESS "localhost:${api_port}"
append_missing_env "$FE_ENV" VITE_HTTP_PROTOCOL http
append_missing_env "$FE_ENV" VITE_WS_PROTOCOL ws
append_missing_env "$FE_ENV" VITE_ENABLE_WEBSOCKET true
append_missing_env "$FE_ENV" VITE_FORMAT_DATETIME VNM

echo "Development config is ready."
