#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib-env.sh
source "$SCRIPT_DIR/lib-env.sh"

ENV_FILE="${1:-$(project_env_file)}"

load_env_file "$ENV_FILE"

require_env_vars \
  VPS_HOST \
  VPS_PORT \
  VPS_USER \
  VPS_PASSWORD \
  VPS_SUDO_PASSWORD \
  VPS_DEPLOY_PATH \
  LETSENCRYPT_EMAIL

PROJECT_ENV_B64="$(
  grep -v '^GH_TOKEN=' "$ENV_FILE" | base64 | tr -d '\n'
)"

set_secret() {
  local name="$1"
  local value="$2"

  gh secret set "$name" --body "$value" >/dev/null
  echo "Updated GitHub secret: $name"
}

set_secret "VPS_HOST" "$VPS_HOST"
set_secret "VPS_PORT" "$VPS_PORT"
set_secret "VPS_USER" "$VPS_USER"
set_secret "VPS_PASSWORD" "$VPS_PASSWORD"
set_secret "VPS_SUDO_PASSWORD" "$VPS_SUDO_PASSWORD"
set_secret "VPS_DEPLOY_PATH" "$VPS_DEPLOY_PATH"
set_secret "PROJECT_ENV_B64" "$PROJECT_ENV_B64"
set_secret "LETSENCRYPT_EMAIL" "$LETSENCRYPT_EMAIL"

smtp_vars=(SMTP_HOST SMTP_PORT SMTP_USERNAME SMTP_PASSWORD SMTP_FROM SMTP_TO)
smtp_present=0
smtp_missing=()

for var_name in "${smtp_vars[@]}"; do
  if [[ -n "${!var_name:-}" ]]; then
    smtp_present=1
  else
    smtp_missing+=("$var_name")
  fi
done

if [[ $smtp_present -eq 1 && ${#smtp_missing[@]} -gt 0 ]]; then
  echo "SMTP secrets are partially configured. Missing: ${smtp_missing[*]}" >&2
  exit 1
fi

if [[ $smtp_present -eq 1 ]]; then
  for var_name in "${smtp_vars[@]}"; do
    set_secret "$var_name" "${!var_name}"
  done
else
  echo "SMTP block left empty. Notification secrets were not updated."
fi
