#!/bin/bash

trim_whitespace() {
  printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

strip_matching_quotes() {
  local value="$1"

  if [[ ${#value} -ge 2 ]]; then
    if [[ ${value:0:1} == '"' && ${value: -1} == '"' ]]; then
      value="${value:1:${#value}-2}"
    elif [[ ${value:0:1} == "'" && ${value: -1} == "'" ]]; then
      value="${value:1:${#value}-2}"
    fi
  fi

  printf '%s' "$value"
}

load_env_file() {
  local env_file="$1"
  local allow_override="${2:-true}"
  local line key value

  if [[ ! -f "$env_file" ]]; then
    echo "env file not found: $env_file" >&2
    return 1
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue

    line="${line#export }"
    key="${line%%=*}"
    value="${line#*=}"
    key="$(trim_whitespace "$key")"
    value="$(trim_whitespace "$value")"
    value="$(strip_matching_quotes "$value")"

    [[ -z "$key" ]] && continue

    if [[ "$allow_override" != "true" && -n "${!key+x}" ]]; then
      continue
    fi

    export "$key=$value"
  done < "$env_file"
}

require_env_vars() {
  local missing=()
  local var_name

  for var_name in "$@"; do
    if [[ -z "${!var_name:-}" ]]; then
      missing+=("$var_name")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "Missing required env vars: ${missing[*]}" >&2
    return 1
  fi
}

derive_loki_base_url() {
  if [[ -n "${LOKI_BASE_URL:-}" ]]; then
    printf '%s' "$LOKI_BASE_URL"
    return 0
  fi

  printf '%s://%s:%s' "${LOKI_SCHEME:-http}" "${LOKI_HOST:-loki}" "${LOKI_PORT:-3100}"
}

project_repo_root() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$script_dir/../.." >/dev/null 2>&1 && pwd
}

project_env_file() {
  local repo_root
  repo_root="$(project_repo_root)"
  printf '%s/deploy/config/project.env' "$repo_root"
}
