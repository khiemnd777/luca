#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib-env.sh
source "$SCRIPT_DIR/lib-env.sh"

REPO_ROOT="$(project_repo_root)"
API_DIR="$REPO_ROOT/api"
ENV_FILE="$API_DIR/.env.prod"
COMPOSE_FILE="$API_DIR/docker-compose.prod.yml"

sudo_run() {
  if [[ -n "${VPS_SUDO_PASSWORD:-}" ]]; then
    printf '%s\n' "$VPS_SUDO_PASSWORD" | sudo -S "$@"
    return 0
  fi

  sudo "$@"
}

resolve_compose_cmd() {
  if sudo_run docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
    return 0
  fi

  if sudo_run docker-compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return 0
  fi

  echo "docker compose is not available." >&2
  exit 1
}

compose() {
  resolve_compose_cmd
  sudo_run "${COMPOSE_CMD[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

print_section() {
  printf '\n===== %s =====\n' "$1"
}

print_listeners() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp || true
    return 0
  fi

  if command -v netstat >/dev/null 2>&1; then
    netstat -ltnp || true
    return 0
  fi

  echo "Neither ss nor netstat is available."
}

main() {
  local mode="${1:-snapshot}"
  shift || true

  print_section "Compose Config (${mode})"
  compose config || true

  print_section "Host Listeners (${mode})"
  print_listeners

  print_section "Docker PS (${mode})"
  sudo_run docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true

  print_section "Compose PS (${mode})"
  compose ps || true

  if [[ "${mode}" == "failure" || "${mode}" == "post-up" ]]; then
    print_section "API Logs (${mode})"
    compose logs --tail=200 api || true

    print_section "Frontend Logs (${mode})"
    compose logs --tail=200 frontend || true
  fi
}

main "$@"
