FROM golang:1.24.1-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    netcat-openbsd \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ENTRYPOINT ["bash", "/app/docker/entrypoint.dev.sh"]
