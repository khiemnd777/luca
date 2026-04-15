SHELL := /bin/bash

COMPOSE ?= docker compose
PROD_ENV_FILE ?= .env.prod
API_SERVICE ?= api
POSTGRES_SERVICE ?= postgres
REDIS_SERVICE ?= redis

.PHONY: docker-up docker-log docker-stop docker-down docker-up-prod docker-up-observable docker-up-observable-prod observability-up observability-down migration migration-prod redis-clean redis-clean-prod wait-postgres wait-postgres-prod wait-redis wait-redis-prod

docker-up:
	$(COMPOSE) up --build -d

docker-log:
	$(COMPOSE) logs -f

docker-stop:
	$(COMPOSE) stop

docker-restart: docker-stop docker-up

docker-down:
	$(COMPOSE) down

docker-up-prod:
	$(COMPOSE) --env-file $(PROD_ENV_FILE) -f docker-compose.prod.yml up --build -d

docker-up-observable: observability-up
	OBSERVABLE=true OBSERVABILITY_STACK_MANAGED_EXTERNALLY=true $(COMPOSE) up --build -d

docker-up-observable-prod: observability-up
	OBSERVABLE=true OBSERVABILITY_STACK_MANAGED_EXTERNALLY=true $(COMPOSE) --env-file $(PROD_ENV_FILE) -f docker-compose.prod.yml up --build -d

observability-up:
	mkdir -p ./tmp/observability/logs ./tmp/observability/loki ./tmp/observability/promtail ./tmp/observability/grafana
	touch ./tmp/observability/logs/noah_api.json.log
	$(COMPOSE) -f docker-compose.observability.yml up -d

observability-down:
	$(COMPOSE) -f docker-compose.observability.yml down

wait-postgres:
	$(COMPOSE) up -d $(POSTGRES_SERVICE)
	until [ "$$($(COMPOSE) ps --format json $(POSTGRES_SERVICE) | tr -d '\n' | sed -n 's/.*"Health":"\([^"]*\)".*/\1/p')" = "healthy" ]; do \
		echo "Waiting for $(POSTGRES_SERVICE) to become healthy..."; \
		sleep 2; \
	done

wait-postgres-prod:
	$(COMPOSE) --env-file $(PROD_ENV_FILE) -f docker-compose.prod.yml up -d $(POSTGRES_SERVICE)
	until [ "$$($(COMPOSE) --env-file $(PROD_ENV_FILE) -f docker-compose.prod.yml ps --format json $(POSTGRES_SERVICE) | tr -d '\n' | sed -n 's/.*"Health":"\([^"]*\)".*/\1/p')" = "healthy" ]; do \
		echo "Waiting for $(POSTGRES_SERVICE) to become healthy..."; \
		sleep 2; \
	done

wait-redis:
	$(COMPOSE) up -d $(REDIS_SERVICE)
	until [ "$$($(COMPOSE) ps --format json $(REDIS_SERVICE) | tr -d '\n' | sed -n 's/.*"Health":"\([^"]*\)".*/\1/p')" = "healthy" ]; do \
		echo "Waiting for $(REDIS_SERVICE) to become healthy..."; \
		sleep 2; \
	done

wait-redis-prod:
	$(COMPOSE) --env-file $(PROD_ENV_FILE) -f docker-compose.prod.yml up -d $(REDIS_SERVICE)
	until [ "$$($(COMPOSE) --env-file $(PROD_ENV_FILE) -f docker-compose.prod.yml ps --format json $(REDIS_SERVICE) | tr -d '\n' | sed -n 's/.*"Health":"\([^"]*\)".*/\1/p')" = "healthy" ]; do \
		echo "Waiting for $(REDIS_SERVICE) to become healthy..."; \
		sleep 2; \
	done

migration: wait-postgres
	$(COMPOSE) run --rm --no-deps --entrypoint /bin/bash $(API_SERVICE) -lc 'go run ./scripts/gen migrate'

migration-prod: wait-postgres-prod
	$(COMPOSE) --env-file $(PROD_ENV_FILE) -f docker-compose.prod.yml run --rm --no-deps --entrypoint /bin/bash $(API_SERVICE) -lc 'go run ./scripts/gen migrate'

redis-clean: wait-redis
	$(COMPOSE) exec $(REDIS_SERVICE) redis-cli FLUSHALL

redis-clean-prod: wait-redis-prod
	$(COMPOSE) --env-file $(PROD_ENV_FILE) -f docker-compose.prod.yml exec $(REDIS_SERVICE) redis-cli FLUSHALL
