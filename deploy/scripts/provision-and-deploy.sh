#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib-env.sh
source "$SCRIPT_DIR/lib-env.sh"

REPO_ROOT="$(project_repo_root)"
DEPLOY_ENV_FILE="$REPO_ROOT/.deploy.env"
PROJECT_ENV_FILE="$(project_env_file)"
NGINX_TEMPLATE="$REPO_ROOT/deploy/templates/nginx-site.conf.tmpl"
GENERATED_DIR="$REPO_ROOT/deploy/tmp"
GENERATED_NGINX_CONF="$GENERATED_DIR/nginx.conf"

if [[ ! -f "$DEPLOY_ENV_FILE" ]]; then
  echo "Missing $DEPLOY_ENV_FILE" >&2
  exit 1
fi

load_env_file "$DEPLOY_ENV_FILE"
require_env_vars PROJECT_ENV_B64 VPS_SUDO_PASSWORD LETSENCRYPT_EMAIL

mkdir -p "$(dirname "$PROJECT_ENV_FILE")" "$GENERATED_DIR"
printf '%s' "$PROJECT_ENV_B64" | base64 --decode > "$PROJECT_ENV_FILE"
chmod 600 "$PROJECT_ENV_FILE"

load_env_file "$PROJECT_ENV_FILE"
require_env_vars PUBLIC_DOMAIN PORT FRONTEND_HOST_PORT VPS_SUDO_PASSWORD

sudo_run() {
  printf '%s\n' "$VPS_SUDO_PASSWORD" | sudo -S "$@"
}

ensure_sudo_access() {
  sudo_run -v >/dev/null
}

install_packages() {
  sudo_run apt-get update
  sudo_run apt-get install -y docker.io nginx certbot python3-certbot-nginx curl rsync
  if ! docker compose version >/dev/null 2>&1; then
    sudo_run apt-get install -y docker-compose-plugin || sudo_run apt-get install -y docker-compose
  fi
  sudo_run systemctl enable --now docker
  sudo_run systemctl enable --now nginx
}

resolve_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return 0
  fi

  echo "docker compose is not available after provisioning." >&2
  exit 1
}

render_runtime_config() {
  "$REPO_ROOT/deploy/scripts/render-production-config.sh" "$PROJECT_ENV_FILE"
  "$REPO_ROOT/api/scripts/render_observability_config.sh" --env-file "$REPO_ROOT/api/.env.prod"
}

render_nginx_config() {
  sed \
    -e "s|__PUBLIC_DOMAIN__|$PUBLIC_DOMAIN|g" \
    -e "s|__API_PORT__|$PORT|g" \
    -e "s|__FRONTEND_HOST_PORT__|$FRONTEND_HOST_PORT|g" \
    "$NGINX_TEMPLATE" > "$GENERATED_NGINX_CONF"
}

install_nginx_config() {
  local site_name="${APP_NAME:-noah}"
  sudo_run install -d -m 755 /etc/nginx/sites-available /etc/nginx/sites-enabled
  sudo_run cp "$GENERATED_NGINX_CONF" "/etc/nginx/sites-available/$site_name.conf"
  sudo_run ln -sf "/etc/nginx/sites-available/$site_name.conf" "/etc/nginx/sites-enabled/$site_name.conf"
  sudo_run nginx -t
  sudo_run systemctl reload nginx
}

check_domain_resolution() {
  local public_ip resolved_ip

  public_ip="$(curl -fsS https://api.ipify.org)"
  resolved_ip="$(getent ahostsv4 "$PUBLIC_DOMAIN" | awk 'NR==1 {print $1}')"

  if [[ -z "$resolved_ip" ]]; then
    echo "Domain $PUBLIC_DOMAIN does not resolve yet." >&2
    exit 1
  fi

  if [[ "$resolved_ip" != "$public_ip" ]]; then
    echo "Domain $PUBLIC_DOMAIN resolves to $resolved_ip but VPS public IP is $public_ip." >&2
    exit 1
  fi
}

ensure_tls() {
  sudo_run certbot --nginx \
    --non-interactive \
    --agree-tos \
    --redirect \
    -m "$LETSENCRYPT_EMAIL" \
    -d "$PUBLIC_DOMAIN"
}

compose_up() {
  cd "$REPO_ROOT/api"
  resolve_compose_cmd
  "${COMPOSE_CMD[@]}" --env-file "$REPO_ROOT/api/.env.prod" -f docker-compose.prod.yml up -d --build
}

wait_for_http() {
  local url="$1"
  local attempt

  for attempt in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null; then
      return 0
    fi
    sleep 2
  done

  echo "Healthcheck failed for $url" >&2
  return 1
}

healthcheck() {
  wait_for_http "http://127.0.0.1:${FRONTEND_HOST_PORT}/"
  wait_for_http "http://127.0.0.1:${PORT}/ping"
  wait_for_http "https://${PUBLIC_DOMAIN}/"
  wait_for_http "https://${PUBLIC_DOMAIN}/api/health"
}

ensure_sudo_access
install_packages
render_runtime_config
render_nginx_config
install_nginx_config
check_domain_resolution
ensure_tls
compose_up
healthcheck

echo "Provision and deploy completed successfully."
