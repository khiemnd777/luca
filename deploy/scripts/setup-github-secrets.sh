#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib-env.sh
source "$SCRIPT_DIR/lib-env.sh"

ENV_FILE="${1:-$(project_env_file)}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install it first: https://cli.github.com/" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing config file: $ENV_FILE" >&2
  echo "Create it first from deploy/config/project.env.example" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  gh auth login
fi

"$SCRIPT_DIR/push-github-secrets.sh" "$ENV_FILE"

echo "GitHub deploy secrets are in sync."
