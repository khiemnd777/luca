# Zero-Touch VPS CI/CD

## Operator flow

Only four operator actions are expected:

1. Copy `deploy/config/project.env.example` to `deploy/config/project.env`.
2. Fill the real values in `deploy/config/project.env`.
3. Run `bash deploy/scripts/setup-github-secrets.sh`.
4. Push to `main`.

After that, GitHub Actions becomes the deploy control plane:

- build frontend
- run `go test ./...`
- rsync a source snapshot to the VPS
- write `.deploy.env` from GitHub secrets
- run `deploy/scripts/provision-and-deploy.sh`
- send success or failure email by SMTP

## Single source of truth

Human-edited config lives in one local file only:

- `deploy/config/project.env`

Tracked schema/template:

- `deploy/config/project.env.example`

Generated runtime files on VPS:

- `deploy/config/project.env`
- `/.env.prod`
- `/api/.env.prod`
- generated Nginx site config
- generated observability config files

Do not commit:

- `deploy/config/project.env`
- `/.env.prod`
- `/api/.env.prod`

## Required GitHub secrets

Deploy/runtime control plane:

- `VPS_HOST`
- `VPS_PORT`
- `VPS_USER`
- `VPS_PASSWORD`
- `VPS_SUDO_PASSWORD`
- `VPS_DEPLOY_PATH`
- `PROJECT_ENV_B64`
- `LETSENCRYPT_EMAIL`

SMTP notifications:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `SMTP_TO`

`deploy/scripts/setup-github-secrets.sh` reads `deploy/config/project.env`, derives `PROJECT_ENV_B64`, and pushes all required secrets through GitHub CLI.

## Runtime rendering

`deploy/scripts/render-production-config.sh` renders:

- `/.env.prod`
- `/api/.env.prod`

`api/scripts/render_observability_config.sh` renders:

- `api/observability/promtail-config.yaml`
- `api/observability/grafana/provisioning/datasources/loki.yaml`

This keeps tracked config free from VPS-specific hardcoded Loki endpoints and runtime secrets.

## Provision and deploy path

Remote deploy entrypoint:

- `deploy/scripts/provision-and-deploy.sh`

Responsibilities:

- decode `PROJECT_ENV_B64`
- write `deploy/config/project.env`
- render production env files
- install Docker, Compose plugin, Nginx, Certbot when missing
- install and reload host Nginx config
- validate domain resolution before certificate issuance
- issue or renew Let's Encrypt certs
- run production compose
- healthcheck frontend and API

Deprecated manual scripts:

- `deploy/scripts/bootstrap-vps.sh`
- `deploy/scripts/vps-deploy.sh`

They intentionally fail fast and point operators back to the GitHub Actions path.

## Production topology

Production compose file:

- `api/docker-compose.prod.yml`

Services:

- `frontend`
- `api`
- `postgres`
- `redis`

Public routing:

- `/` -> frontend container
- `/api` -> backend gateway
- `/ws` -> backend websocket path
- `/api/health` -> backend `/ping` via host Nginx

Frontend defaults to same-origin API and WebSocket URLs in production through `fe/src/core/config/env.ts`, so production no longer depends on dev-oriented Vite addresses.

## Loki de-hardcoding

Explicit Loki config keys:

- `LOKI_SCHEME`
- `LOKI_HOST`
- `LOKI_PORT`
- `LOKI_HOST_PORT`
- `LOKI_BASE_URL`

Rule:

- `LOKI_BASE_URL` wins if present
- otherwise render derives `${LOKI_SCHEME}://${LOKI_HOST}:${LOKI_PORT}`

Affected tracked surfaces:

- `deploy/config/project.env.example`
- `api/.env.sample`
- `api/docker-compose.observability.yml`
- `api/observability/promtail-config.yaml.tmpl`
- `api/observability/grafana/provisioning/datasources/loki.yaml.tmpl`

## Validation checklist

Static/local checks:

- workflow YAML parses
- `setup-github-secrets.sh` reads `deploy/config/project.env`
- `push-github-secrets.sh` enforces complete-or-empty SMTP config
- `render-production-config.sh` renders `/.env.prod` and `/api/.env.prod`
- `render_observability_config.sh` renders Promtail and Grafana datasource config
- `docker compose --env-file api/.env.prod -f api/docker-compose.prod.yml config`
- `docker compose -f api/docker-compose.observability.yml config`

Deploy checks:

- push to `main` triggers deploy workflow
- FE build passes
- `go test ./...` passes
- password SSH login works
- `sudo -S` works
- repo snapshot sync completes
- runtime packages are provisioned
- FE/API/Postgres/Redis boot
- `/`, `/api/health`, and `/ws` routing stay intact
- TLS issues or renews
- success or failure email is sent

Known repo reality:

- frontend build debt can still fail the workflow before deploy
- dirty local changes outside this scope were left untouched
