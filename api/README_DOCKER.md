# Docker Runbook

## Development Docker

Chạy trong thư mục `/api`:

```bash
make docker-up-dev
```

Chạy nền:

```bash
docker compose up --build -d
```

Chạy app kèm observability:

```bash
make docker-up-observable
```

Dừng:

```bash
docker compose down
```

Xóa containers và named volumes:

```bash
docker compose down -v
```

API gateway mặc định:

- `http://localhost:${PORT}`

Frontend development mặc định:

- `http://localhost:${FRONTEND_HOST_PORT}`
- service `frontend` chạy bằng `bun run dev`
- source `fe/` được bind mount vào container để Vite hot reload khi file thay đổi
- `/app/node_modules` dùng named volume riêng để dependencies trong container không bị bind mount host ghi đè

Services local:

- Postgres: `localhost:5431`
- Redis: `localhost:6378`

`make docker-up-dev` sẽ chạy `deploy/scripts/render-development-config.sh` trước khi start Compose. Script này tạo file env từ `.env.sample` nếu thiếu và chỉ bổ sung các key chưa có; các giá trị local hiện hữu không bị ghi đè.

## Production topology

Production compose chạy toàn bộ stack:

- `frontend`
- `api`
- `postgres`
- `redis`

File chính:

- `api/docker-compose.prod.yml`

Frontend production được build bằng `fe/Dockerfile.prod`, serve bằng nginx trong container FE, rồi host-level nginx trên VPS reverse proxy:

- `/` -> frontend container
- `/api` -> backend gateway
- `/ws` -> backend websocket path

Frontend public host port được tách riêng bằng `FRONTEND_HOST_PORT`. Backend vẫn publish `PORT`, còn Postgres và Redis chỉ giữ internal ports `5432` và `6379` trong Docker network.

Production không dùng `bun run dev`, không mount source code FE, và không bật Vite hot reload. Development và production dùng Dockerfile/Compose runtime riêng để tránh lẫn hành vi.

## Production-like local run

Chạy:

```bash
docker compose --env-file api/.env.prod -f api/docker-compose.prod.yml up --build -d
```

Dừng:

```bash
docker compose --env-file api/.env.prod -f api/docker-compose.prod.yml down
```

Xóa containers và named volumes:

```bash
docker compose --env-file api/.env.prod -f api/docker-compose.prod.yml down -v
```

## Notes

- Dev mặc định dùng bộ file không hậu tố: `/.env`, `/api/.env`, `/fe/.env`, `/api/Dockerfile`, `/fe/Dockerfile.dev`, `/api/docker-compose.yml`.
- Production-like dùng bộ file hậu tố `.prod`: `/api/.env.prod`, `/api/Dockerfile.prod`, `/api/docker-compose.prod.yml`.
- Trong zero-touch flow, `/.env.prod` và `/api/.env.prod` được render từ `deploy/config/project.env` bằng `deploy/scripts/render-production-config.sh`. Không điền tay các file runtime này trên VPS.
- Dữ liệu Postgres và Redis được mount từ `PGDATA_DIR` và `REDISDATA_DIR` trong file env tương ứng.
- Với dev, Compose đọc trực tiếp `.env`; với production-like, hãy luôn chạy kèm `--env-file .env.prod`.
- `run.sh` và `start_app.sh` sẽ nạp `./.env` mặc định, và tự chuyển sang `./.env.prod` khi `APP_ENV=production`.
- App chỉ dùng một nhánh cấu hình: `config.yaml` và `modules/*/config.yaml`, với giá trị lấy từ `.env`.
- Local dev compose mount source code API và FE vào container để giữ workflow chỉnh code nhanh.
- Trong Docker network nội bộ, `api` luôn connect `postgres:5432` và `redis:6379`; các port `5431` và `6378` chỉ là port publish ra host.
- Production-like compose không mount source code; chỉ mount storage và cache volume.
- `PGDATA_DIR` và `REDISDATA_DIR` là bind mounts. `docker compose down -v` không xóa dữ liệu trong hai thư mục này; muốn dọn sạch thì xóa trực tiếp các path đó.
- Cần Docker daemon đang chạy trước khi execute các lệnh trên.
- Compose hiện tại cố ý bám theo kịch bản `./build_run.sh`: sau khi Postgres và Redis healthy, app container sẽ chạy `./init_project.sh` rồi mới `./run.sh`.
- Điều này có nghĩa là Docker startup sẽ chạy cả các bước prepare cũ trong container: shared Ent generate, `scripts/init_db`, module Ent migrate script, `go mod tidy`, `go mod vendor`, `scripts/init_roles`, `go build ./...`, rồi mới `go run main.go`.
- Compose mặc định chạy toàn bộ migration và bootstrap bên trong app container, không cần migration CLI trên host.
- Flow khởi động hiện tại là `wait dependencies -> init_project.sh -> run.sh -> Ent auto-migrate + app-managed SQL migrations + bootstrap seed`.
- Khi dùng `make docker-up-observable`, observability stack sẽ được bật từ host bằng `docker-compose.observability.yml`, còn app container chỉ bật chế độ `--observable` để mirror log ra `tmp/observability/logs/noah_api.json.log`.
- Với Docker, không để container tự gọi `observability_up.sh`; observability compose được quản lý riêng để tránh chạy Docker bên trong container.
- FE development container chạy `bun run dev` để phục vụ Vite/HMR. FE production build vẫn là deploy gate trong GitHub Actions. Việc FE container được build lại trên VPS chỉ là runtime packaging, không thay thế build gate trên CI.
- App sẽ tự đọc các file `migrations/sql/V*.sql`, apply theo version và ghi nhận vào bảng `schema_migrations` trong Postgres.
- Nếu trước đó đã từng chạy compose với service migration cũ, có thể dọn orphan bằng:

```bash
docker compose down --remove-orphans
```
