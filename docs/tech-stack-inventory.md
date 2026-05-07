# Project Tech Stack Inventory

## 1. Overview

This repository contains two confirmed runtime applications:

- `fe/`: a React + TypeScript admin frontend built with Vite.
- `api/`: a Go backend composed from gateway-launched modules under `api/modules/*`.

The backend boot path in `api/main.go` initializes config, logging, PostgreSQL connectivity, Ent, SQL migrations, Redis, circuit breakers, cron jobs, and the Fiber gateway. The gateway runtime in `api/gateway/runtime/start.go` generates a module registry from `api/modules/*/config.yaml`, starts modules through the module runner, and reverse-proxies external module routes.

The frontend auto-loads feature modules from `fe/src/features/**/index.tsx` through `fe/src/core/index.ts`, builds permission-guarded routes in `fe/src/app/routes.tsx`, uses shared Axios clients under `fe/src/core/network/*`, and mounts a WebSocket provider in `fe/src/app/app.tsx`.

## 2. Tech Stack Table

| Category | Technology | Version | Evidence | Purpose | Status |
| --- | --- | --- | --- | --- | --- |
| Backend | Go | 1.24.1 | `api/go.mod`, `api/Dockerfile`, `api/Dockerfile.prod` | Backend language/runtime | Active |
| Backend | Fiber | v2.52.8 | `api/go.mod`, `api/main.go`, `api/gateway/main.go` | HTTP server and gateway composition | Active |
| Backend | `gofiber/websocket` | v2.2.1 | `api/go.mod`, `api/modules/realtime/handler/websocket_handler.go` | WebSocket handler transport | Active |
| Backend | `gorilla/websocket` | v1.5.3 | `api/go.mod`, `api/gateway/proxy/ws_proxy.go` | Gateway WebSocket proxying | Active |
| Backend | JWT (`golang-jwt/jwt/v5`) | v5.3.0 | `api/go.mod`, `api/shared/utils/jwtutil.go`, `api/shared/middleware/auth.go` | Token signing/parsing and auth middleware | Active |
| Backend | Ent | v0.14.4 | `api/go.mod`, `api/main.go`, `api/shared/db/ent/generate.go`, `api/shared/gen/tasks.go` | ORM and schema/code generation | Active |
| Backend | Viper | v1.20.1 | `api/go.mod`, `api/shared/config/init.go`, `api/shared/cron/cron_manager.go` | YAML/env-backed configuration | Active |
| Backend | Zap | v1.27.0 | `api/go.mod`, `api/shared/logger/logger.go` | Structured JSON logging | Active |
| Backend | `sony/gobreaker` | v1.0.0 | `api/go.mod`, `api/shared/circuitbreaker/cb.go`, `api/shared/app/http_client.go` | Circuit breaker for internal HTTP calls | Active |
| Backend | `robfig/cron/v3` | v3.0.1 | `api/go.mod`, `api/main.go`, `api/shared/cron/cron_manager.go` | Scheduled jobs | Active |
| Backend | `webpush-go` | v1.4.0 | `api/go.mod` | Web push support dependency | Active |
| Backend | Chromedp | v0.14.2 | `api/go.mod`, `api/Dockerfile`, `api/Dockerfile.prod` | Headless Chromium/browser automation dependency | Active |
| Backend | `disintegration/imaging` | v1.6.2 | `api/go.mod` | Image processing dependency | Active |
| Backend | Excelize | v2.10.0 | `api/go.mod` | Spreadsheet import/export dependency | Active |
| Frontend | React | 19.1.1 | `fe/package.json`, `fe/src/main.tsx` | Frontend rendering | Active |
| Frontend | TypeScript | 5.9.3 | `fe/package.json`, `fe/tsconfig.json` | Typed frontend code | Active |
| Frontend | Vite | 7.1.7 | `fe/package.json`, `fe/vite.config.ts` | Dev server and build tool | Active |
| Frontend | `@vitejs/plugin-react-swc` | 4.1.0 | `fe/package.json`, `fe/vite.config.ts` | React transform plugin | Active |
| Frontend | React Router DOM | 7.9.4 | `fe/package.json`, `fe/src/app/routes.tsx` | Browser routing | Active |
| Frontend | Zustand | 5.0.8 | `fe/package.json`, `fe/src/store/auth-store.ts` | Client auth/session state | Active |
| Frontend | Axios | 1.13.1 | `fe/package.json`, `fe/src/core/network/axios-client.ts`, `fe/src/core/network/api-client.ts` | Shared HTTP client layer | Active |
| Frontend | Material UI | 7.3.4 | `fe/package.json`, `fe/src/main.tsx`, `fe/src/app/theme.ts` | UI component system | Active |
| Frontend | MUI X Data Grid | 8.27.0 | `fe/package.json`, `fe/src/core/table` | Table/grid infrastructure | Active |
| Frontend | MUI X Date Pickers | 8.16.0 | `fe/package.json`, `fe/src/app/app.tsx` | Date/time input components | Active |
| Frontend | Day.js | 1.11.19 | `fe/package.json`, `fe/src/app/app.tsx` | Date adapter for UI | Active |
| Frontend | `react-hot-toast` | 2.6.0 | `fe/package.json`, `fe/src/app/app.tsx` | Toast notifications | Active |
| Frontend | Recharts | 3.7.0 | `fe/package.json`, `fe/src/features/observability_logs/components/system-log-summary-cards.tsx` | Charting in observability UI | Active |
| Frontend | `@dnd-kit/core` / `@dnd-kit/sortable` | 6.3.1 / 10.0.0 | `fe/package.json`, `fe/src/shared/components/status-board`, `fe/src/core/table/edit-table.tsx` | Drag-and-drop interactions | Active |
| Frontend | Nano ID | 5.1.6 | `fe/package.json` | Client-side ID generation dependency | Active |
| Frontend | `react-number-format` | 5.4.4 | `fe/package.json` | Formatted numeric inputs | Active |
| Frontend | QR code libraries | `react-qr-code` 2.0.18, `react-qrcode-logo` 4.0.0 | `fe/package.json` | QR rendering dependencies | Active |
| Data | PostgreSQL | `postgres:16-alpine` image | `api/docker-compose.yml`, `api/docker-compose.prod.yml`, `api/shared/db/driver/postgres.go` | Primary relational database | Active |
| Data | Redis | `redis:7-alpine` image, client v9.12.1 | `api/docker-compose.yml`, `api/go.mod`, `api/config.yaml`, `api/shared/redis/manager.go` | Cache, pub/sub, and status instances | Active |
| Data | Redis Pub/Sub | Not confirmed separately | `api/shared/pubsub/pubsub.go`, `api/modules/search/service/service.go`, `api/modules/realtime/service/pubsub.go`, `api/modules/auditlog/service/pubsub.go` | Cross-module async messaging | Active |
| Data | App-managed SQL migrations | Not confirmed separately | `api/shared/bootstrap/sql_migrations.go`, `api/migrations/sql/V1__baseline.sql`, `api/shared/gen/tasks.go` | Versioned SQL migrations at boot time | Active |
| Data | MongoDB driver | v1.17.4 | `api/go.mod`, `api/config.yaml`, `api/shared/db/factory.go`, `api/shared/db/driver/mongodb.go` | Optional database provider path | Configured |
| Data | Filesystem-backed storage | Not confirmed separately | `api/docker-compose.prod.yml`, `api/modules/photo/service/photo_file.go`, `api/shared/storage/local_storage.go` | Local file storage for photo/files | Active |
| Infra | Docker | Not confirmed separately | `api/Dockerfile`, `api/Dockerfile.prod`, `fe/Dockerfile.dev`, `fe/Dockerfile.prod`, `api/docker/entrypoint.dev.sh`, `api/docker/entrypoint.prod.sh` | Backend and frontend containerization | Active |
| Infra | Docker Compose | Not confirmed separately | `api/docker-compose.yml`, `api/docker-compose.prod.yml`, `api/docker-compose.observability.yml`, `api/Makefile` | Local and production-like orchestration | Active |
| Infra | GitHub Actions | Not confirmed separately | `.github/workflows/deploy.yml`, `docs/vps-cicd.md` | Active deploy control plane for main branch and manual dispatch | Active |
| Infra | VPS deploy scripts | Not confirmed separately | `deploy/scripts/provision-and-deploy.sh`, `deploy/scripts/render-production-config.sh`, `deploy/scripts/setup-github-secrets.sh`, `docs/vps-cicd.md` | Source sync, production env rendering, host provisioning, and compose startup | Active |
| Infra | Frontend development Docker | `oven/bun:1.2.22` | `fe/Dockerfile.dev`, `api/docker-compose.yml`, `fe/package.json` | Runs Vite development server through `bun run dev` with bind-mounted source and hot reload | Active |
| Infra | Frontend production Nginx | `nginx:1.27-alpine` | `fe/Dockerfile.prod`, `fe/docker/nginx.prod.conf` | Serves built frontend assets in production compose | Active |
| Infra | Host Nginx | Not confirmed separately | `deploy/templates/nginx-site.conf.tmpl`, `deploy/scripts/provision-and-deploy.sh`, `docs/vps-cicd.md` | Host reverse proxy for frontend, API, and WebSocket traffic | Active |
| Infra | Certbot / Let's Encrypt | Not confirmed separately | `deploy/scripts/provision-and-deploy.sh`, `docs/vps-cicd.md` | TLS certificate issuance and renewal through host Nginx | Active |
| Infra | Loki | `grafana/loki:2.9.8` | `api/docker-compose.observability.yml`, `api/observability/loki-config.yaml`, `api/modules/observability/repository/loki_repository.go` | Log storage/query backend | Configured |
| Infra | Promtail | `grafana/promtail:2.9.8` | `api/docker-compose.observability.yml`, `api/observability/promtail-config.yaml` | Log shipping into Loki | Configured |
| Infra | Grafana | `grafana/grafana:11.1.5` | `api/docker-compose.observability.yml`, `api/observability/grafana/provisioning/datasources/loki.yaml` | Log exploration UI | Configured |
| Infra | GNU Make | Not confirmed separately | `api/Makefile` | Local ops wrapper for compose, migrations, observability | Active |
| Infra | Drone CI | Not confirmed | `api/CICD.md` | Legacy CI flow documented only, not the active repo pipeline | Legacy |
| Infra | Firebase deployment | Not confirmed | `api/CICD.md` | Legacy deployment flow documented only, not the active repo pipeline | Legacy |
| Tooling | ESLint | 9.36.0 | `fe/package.json`, `fe/eslint.config.js` | Frontend linting | Active |
| Tooling | `typescript-eslint` | 8.45.0 | `fe/package.json`, `fe/eslint.config.js` | Type-aware lint rules | Active |
| Tooling | Bun | Not confirmed separately | `fe/package.json`, `fe/bun.lock` | Frontend scaffolding command runner | Configured |
| Tooling | Ent code generation | Not confirmed separately | `api/shared/gen/tasks.go`, `api/scripts/gen/main.go`, `api/shared/db/ent/generate.go` | ORM code generation workflow | Active |
| Tooling | Atlas | v0.36.1 (indirect) | `api/go.mod` | Ent ecosystem dependency | Configured |
| Tooling | Custom Go CLIs | Not confirmed separately | `api/scripts/create_module/main.go`, `api/scripts/create_dept_module/main.go`, `api/scripts/module_runner/main.go`, `api/scripts/status_monitor/main.go` | Scaffolding and local backend operations | Active |

## 3. Architecture Diagram

```mermaid
flowchart LR
  subgraph FE["Frontend App"]
    FEApp["React/Vite app"]
    FERoutes["Guarded route registry"]
    FEWS["WebSocket provider"]
  end

  subgraph API["Backend App"]
    Gateway["Fiber gateway"]
    Modules["Feature modules"]
    Search["Search module"]
    Realtime["Realtime module"]
    Audit["Auditlog module"]
    Obs["Observability module"]
  end

  subgraph DATA["Data Systems"]
    PG["PostgreSQL"]
    Redis["Redis"]
    FS["Local storage"]
    Loki["Loki"]
  end

  Promtail["Promtail"]
  Grafana["Grafana"]

  FEApp --> FERoutes
  FERoutes -->|HTTP /api/*| Gateway
  FEWS -->|WS| Gateway
  Gateway --> Modules
  Modules --> PG
  Modules --> Redis
  Modules --> FS
  Search --> Redis
  Realtime --> Redis
  Audit --> Redis
  Obs --> Loki
  Promtail --> Loki
  Grafana --> Loki
```

## 4. Backend Stack

- Runtime and boot: `api/main.go` loads env/config, configures logging, initializes the DB client, bootstraps Ent, applies SQL migrations, seeds roles/permissions, initializes Redis, circuit breakers, workers, and crons, then starts the gateway.
- Composition: `api/gateway/runtime/start.go` generates runtime metadata from `api/modules/*`, starts modules through `api/scripts/module_runner/runner`, and reverse-proxies external module routes through Fiber.
- Runtime module ownership and per-module navigation are tracked in `docs/module-inventory.md`.
- Auth and permissions: JWT helpers are in `api/shared/utils/jwtutil.go`, request auth middleware is in `api/shared/middleware/auth.go`, and RBAC middleware is in `api/shared/middleware/rbac/rbac.go`.
- Resilience: `api/shared/app/http_client.go` wraps internal module-to-module HTTP calls with retry logic and `api/shared/circuitbreaker/cb.go`.

## 5. Frontend Stack

- The frontend boot path is `fe/src/main.tsx`, which mounts the MUI theme and imports `fe/src/core/index.ts`.
- `fe/src/core/index.ts` auto-loads feature registrars, schemas, tables, widgets, and core modules through `import.meta.glob(...)`.
- `fe/src/app/routes.tsx` builds the active router with `createBrowserRouter(...)` and wraps protected pages in `RequireAuth`.
- Shared networking is Axios-based. The repo currently contains two client implementations: `fe/src/core/network/axios-client.ts` and `fe/src/core/network/api-client.ts`.
- Auth/session state is in `fe/src/store/auth-store.ts` using Zustand persistence middleware.
- Realtime is mounted in `fe/src/app/app.tsx` and implemented in `fe/src/core/network/websocket/ws-client.ts`.

## 6. Data Layer

- PostgreSQL is the only confirmed active primary database. It is provisioned in both Compose files and used by the Go PostgreSQL driver path.
- SQL migrations are applied in-process through `api/shared/bootstrap/sql_migrations.go`.
- Redis is active and multi-instance. `api/config.yaml` defines `cache`, `pubsub`, and `status` instances, and `api/shared/redis/manager.go` initializes named clients.
- Redis pub/sub is actively consumed by at least the search, auditlog, and realtime modules.
- MongoDB support exists in code and config, but no active provisioning or module runtime evidence confirms it as a deployed path.
- The photo/storage path is filesystem-backed. No S3-compatible or external object storage integration was confirmed.
- No vector database was confirmed.

## 7. Infrastructure & DevOps

- Backend containers are built from `golang:1.24.1-bookworm` in both `api/Dockerfile` and `api/Dockerfile.prod`.
- Frontend development containers are built from `oven/bun:1.2.22` in `fe/Dockerfile.dev`, run `bun run dev`, mount `fe/` into `/app`, and use polling-backed Vite hot reload through `api/docker-compose.yml`.
- Frontend production containers are built from `oven/bun:1.2.15` and served by `nginx:1.27-alpine` in `fe/Dockerfile.prod`.
- Compose is the confirmed infrastructure entrypoint for local and production-like environments: `api/docker-compose.yml`, `api/docker-compose.prod.yml`, and `api/docker-compose.observability.yml`. Development config is prepared by `deploy/scripts/render-development-config.sh`, which creates missing env files from samples and appends missing dev keys without overwriting local values.
- GitHub Actions is the active repo-resident deploy control plane. `.github/workflows/deploy.yml` builds the frontend with Bun, generates Ent code, runs `go test ./...`, installs SSH deploy tools, rsyncs a source snapshot to the VPS, writes `.deploy.env` from GitHub secrets, runs `deploy/scripts/provision-and-deploy.sh`, and optionally sends SMTP deploy notifications.
- The VPS deploy path renders production env files through `deploy/scripts/render-production-config.sh`, then starts the production stack through `api/docker-compose.prod.yml`.
- Host Nginx configuration is generated from `deploy/templates/nginx-site.conf.tmpl`; the template reverse-proxies frontend, API, and WebSocket traffic.
- TLS automation is handled by Certbot / Let's Encrypt in `deploy/scripts/provision-and-deploy.sh`.
- The optional observability stack provisions Loki, Promtail, and Grafana locally.
- `api/Makefile` wraps compose startup, development config rendering, observability startup, migrations, and Redis flush operations.
- `api/CICD.md` documents Drone/Firebase flows only and is legacy documentation, not the active repo pipeline.

## 8. Observability & Tooling

- Logging is implemented with Zap and configured as JSON output in `api/shared/logger/logger.go`.
- The observability module queries Loki through `api/modules/observability/repository/loki_repository.go`.
- Promtail is configured to ship local log files into Loki, and Grafana is provisioned with a Loki datasource.
- Ent generation and migration helpers are exposed through `api/scripts/gen/main.go` and `api/shared/gen/tasks.go`.
- The repo includes custom scaffolding and local-ops CLIs under `api/scripts/*` and `fe/scripts/create-module`.
- Frontend linting is configured through ESLint and `typescript-eslint`.

## 9. Module Interaction Diagram

```mermaid
flowchart TD
  FECore["FE core loader"]
  FEFeatures["FE features"]
  FEApi["Axios client layer"]
  Gateway["Gateway runtime"]
  Main["Main module"]
  Auth["Auth module"]
  Search["Search module"]
  Audit["Auditlog module"]
  Realtime["Realtime module"]
  Obs["Observability module"]
  Redis["Redis"]
  PG["PostgreSQL"]
  Loki["Loki"]

  FECore --> FEFeatures
  FEFeatures --> FEApi
  FEApi --> Gateway
  Gateway --> Main
  Gateway --> Auth
  Gateway --> Search
  Gateway --> Audit
  Gateway --> Realtime
  Gateway --> Obs
  Main --> PG
  Auth --> PG
  Main --> Redis
  Search --> Redis
  Audit --> Redis
  Realtime --> Redis
  Obs --> Loki
```

## 10. Data Flow Diagram

```mermaid
flowchart LR
  Browser["Browser"]
  FE["React app"]
  API["Fiber gateway"]
  Modules["API modules"]
  Cache["Redis cache"]
  PubSub["Redis pub/sub"]
  DB["PostgreSQL"]
  Storage["Local storage"]
  WS["Realtime WS"]
  Loki["Loki"]

  Browser --> FE
  FE -->|REST| API
  FE -->|WebSocket| WS
  API --> Modules
  Modules -->|read-through / invalidation| Cache
  Modules -->|publish / subscribe| PubSub
  Modules -->|ORM / SQL| DB
  Modules -->|file operations| Storage
  Modules -->|log queries| Loki
```

## 11. Module Ownership

Detailed module ownership, frontend feature registration, backend main subfeatures, and FE/API navigation hints live in `docs/module-inventory.md`. This file intentionally keeps only stack, runtime, data, infrastructure, and tooling inventory to avoid duplicate module maps.

## 12. Risks / Inconsistencies

- `fe/src/routes/router.tsx` exists alongside the active router in `fe/src/app/routes.tsx`, which suggests a parallel or stale routing path.
- The frontend networking layer is duplicated across `fe/src/core/network/axios-client.ts` and `fe/src/core/network/api-client.ts`.
- `README.md` still mentions Flyway-style migration history, while runtime migration execution is implemented in `api/shared/bootstrap/sql_migrations.go`.
- `fe/README.md` references React 18, but `fe/package.json` pins React 19.1.1.
- MongoDB support is present in code/config, but active deployment evidence was not found.
- Drone/Firebase deployment is documented in `api/CICD.md`, but the active repo pipeline is GitHub Actions + VPS deploy.
- Observability infrastructure is configured locally, but always-on production deployment was not confirmed.

## 13. Evidence Appendix

Primary manifests and config:

- `api/go.mod`
- `api/config.yaml`
- `api/Dockerfile`
- `api/Dockerfile.prod`
- `api/docker-compose.yml`
- `api/docker-compose.prod.yml`
- `api/docker-compose.observability.yml`
- `api/Makefile`
- `api/CICD.md`
- `api/README_DOCKER.md`
- `api/OBSERVABILITY_LOCAL.md`
- `.github/workflows/deploy.yml`
- `deploy/config/project.env.example`
- `deploy/scripts/provision-and-deploy.sh`
- `deploy/scripts/render-development-config.sh`
- `deploy/scripts/render-production-config.sh`
- `deploy/scripts/setup-github-secrets.sh`
- `deploy/templates/nginx-site.conf.tmpl`
- `docs/vps-cicd.md`
- `fe/package.json`
- `fe/tsconfig.json`
- `fe/eslint.config.js`
- `fe/vite.config.ts`
- `fe/Dockerfile.dev`
- `fe/Dockerfile.prod`
- `fe/README.md`
- `fe/bun.lock`

Backend runtime, data, and shared platform:

- `api/main.go`
- `api/gateway/main.go`
- `api/gateway/runtime/start.go`
- `api/gateway/proxy/ws_proxy.go`
- `api/shared/config/init.go`
- `api/shared/logger/logger.go`
- `api/shared/app/http_client.go`
- `api/shared/circuitbreaker/cb.go`
- `api/shared/cron/cron_manager.go`
- `api/shared/db/factory.go`
- `api/shared/db/driver/postgres.go`
- `api/shared/db/driver/mongodb.go`
- `api/shared/db/ent/generate.go`
- `api/shared/gen/tasks.go`
- `api/shared/bootstrap/sql_migrations.go`
- `api/shared/redis/manager.go`
- `api/shared/cache/cache.go`
- `api/shared/pubsub/pubsub.go`
- `api/shared/storage/local_storage.go`
- `api/shared/middleware/auth.go`
- `api/shared/middleware/rbac/rbac.go`
- `api/shared/utils/jwtutil.go`

Frontend runtime:

- `fe/src/main.tsx`
- `fe/src/app/app.tsx`
- `fe/src/app/routes.tsx`
- `fe/src/app/theme.ts`
- `fe/src/core/index.ts`
- `fe/src/core/auth/require-auth.tsx`
- `fe/src/core/network/axios-client.ts`
- `fe/src/core/network/api-client.ts`
- `fe/src/core/network/websocket/ws-client.ts`
- `fe/src/store/auth-store.ts`

Module and feature ownership evidence is maintained in `docs/module-inventory.md`.
