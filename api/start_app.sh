#!/bin/bash

# ✅ Default path
APP_PATH="~/honvang_app/develop"

# ✅ Parse arguments
for arg in "$@"
do
  case $arg in
    --path=*)
      APP_PATH="${arg#*=}"
      shift
      ;;
    *)
      ;;
  esac
done

echo "🚀 Starting app from: $APP_PATH"

# ✅ Add Go to PATH
export PATH=$PATH:/usr/local/go/bin

# ✅ Change dir (expand ~ if needed)
cd $(eval echo "$APP_PATH") || {
  echo "❌ Cannot cd into $APP_PATH"
  exit 1
}

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

ENV_FILE="./.env"
if [ "${APP_ENV:-development}" = "production" ] && [ -f "./.env.prod" ]; then
  ENV_FILE="./.env.prod"
fi

load_dotenv "$ENV_FILE"

# ✅ Kill any old instance
pkill -f "go run ./main.go" || true

# ✅ Start app
setsid nohup go run ./main.go > ./dev.log 2>&1 < /dev/null &

echo "✅ App started. Logs: $APP_PATH/dev.log"
