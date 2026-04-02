# Docker Runbook

## Local dev

Chạy trong thư mục `/api`:

```bash
docker compose up --build
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

- `http://localhost:7999`

Services local:

- Postgres: `localhost:5431`
- Redis: `localhost:6378`

## Production-like

Chạy:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up --build -d
```

Dừng:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

Xóa containers và named volumes:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down -v
```

## Notes

- Dev mặc định dùng bộ file không hậu tố: `/api/.env`, `/api/Dockerfile`, `/api/docker-compose.yml`.
- Production-like dùng bộ file hậu tố `.prod`: `/api/.env.prod`, `/api/Dockerfile.prod`, `/api/docker-compose.prod.yml`.
- Dữ liệu Postgres và Redis được mount từ `PGDATA_DIR` và `REDISDATA_DIR` trong file env tương ứng.
- Với dev, Compose đọc trực tiếp `.env`; với production-like, hãy luôn chạy kèm `--env-file .env.prod`.
- `run.sh` và `start_app.sh` sẽ nạp `./.env` mặc định, và tự chuyển sang `./.env.prod` khi `APP_ENV=production`.
- App chỉ dùng một nhánh cấu hình: `config.yaml` và `modules/*/config.yaml`, với giá trị lấy từ `.env`.
- Local dev compose mount source code vào container để giữ workflow chỉnh code nhanh.
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
- App sẽ tự đọc các file `migrations/sql/V*.sql`, apply theo version và ghi nhận vào bảng `schema_migrations` trong Postgres.
- Nếu trước đó đã từng chạy compose với service migration cũ, có thể dọn orphan bằng:

```bash
docker compose down --remove-orphans
```
