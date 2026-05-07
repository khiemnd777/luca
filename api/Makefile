SHELL := /bin/bash

COMPOSE ?= docker compose
PROD_ENV_FILE ?= .env.prod
DEV_CONFIG_SCRIPT ?= ../deploy/scripts/render-development-config.sh
API_SERVICE ?= api
POSTGRES_SERVICE ?= postgres
REDIS_SERVICE ?= redis

.PHONY: render-dev-config docker-up docker-up-dev docker-log docker-log-dev docker-stop docker-stop-dev docker-restart docker-restart-dev docker-restart-observable docker-down docker-down-dev docker-up-prod docker-up-observable docker-up-observable-prod observability-up observability-down migration migration-prod redis-clean redis-clean-prod wait-postgres wait-postgres-prod wait-redis wait-redis-prod

render-dev-config:
	$(DEV_CONFIG_SCRIPT)

docker-up: docker-up-dev

docker-up-dev: render-dev-config
	$(COMPOSE) up --build -d

docker-log: docker-log-dev

docker-log-dev:
	$(COMPOSE) logs -f

docker-stop: docker-stop-dev

docker-stop-dev:
	$(COMPOSE) stop

docker-restart: docker-restart-dev

docker-restart-dev: docker-stop-dev docker-up-dev

docker-restart-observable: docker-down observability-up
	OBSERVABLE=true OBSERVABILITY_STACK_MANAGED_EXTERNALLY=true $(COMPOSE) up --build -d

docker-down: docker-down-dev

docker-down-dev:
	$(COMPOSE) down

docker-up-prod:
	$(COMPOSE) --env-file $(PROD_ENV_FILE) -f docker-compose.prod.yml up --build -d

docker-up-observable: observability-up
	OBSERVABLE=true OBSERVABILITY_STACK_MANAGED_EXTERNALLY=true $(COMPOSE) up --build -d

docker-up-observable-prod: observability-up
	OBSERVABLE=true OBSERVABILITY_STACK_MANAGED_EXTERNALLY=true $(COMPOSE) --env-file $(PROD_ENV_FILE) -f docker-compose.prod.yml up --build -d

observability-up:
	./observability_up.sh

observability-down:
	./observability_down.sh

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
