#!/bin/bash
set -euo pipefail

cd /app

STORAGE_ROOT="${STORAGE_ROOT:-/app/storage}"
PHOTO_STORAGE_PATH="${PHOTO_STORAGE_PATH:-${STORAGE_ROOT}/photo}"

mkdir -p .gocache tmp "${STORAGE_ROOT}" "${PHOTO_STORAGE_PATH}/original" "${PHOTO_STORAGE_PATH}/medium"

PG_HOST="${PG_HOST:-postgres}"
PG_PORT="${PG_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

echo "Waiting for Postgres at ${PG_HOST}:${PG_PORT}..."
until pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "${PG_USER:-postgres}" -d "${PG_DBNAME:-noahdb}" >/dev/null 2>&1; do
  sleep 2
done

echo "Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT}..."
until nc -z "$REDIS_HOST" "$REDIS_PORT" >/dev/null 2>&1; do
  sleep 2
done

echo "Running init_project.sh to mirror build_run.sh..."
bash /app/init_project.sh

RUN_ARGS=(--env="${APP_ENV:-production}")

if [ "${OBSERVABLE:-false}" = "true" ]; then
  RUN_ARGS+=(--observable)
fi

exec /app/run.sh "${RUN_ARGS[@]}"
