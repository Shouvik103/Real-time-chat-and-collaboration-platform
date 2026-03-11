# =============================================================================
# Makefile — Chat Platform Development & Production Commands
# =============================================================================

.PHONY: up down logs ps clean prod prod-down prod-logs \
        test test-auth test-messaging lint migrate seed \
        shell-auth shell-messaging shell-postgres build help

# ── Development ──────────────────────────────────────────────────────────────

## Start all 3 local services (kills any existing instances first)
dev:
	@echo "Killing any processes on ports 3001, 3002, 5173..."
	@lsof -ti:3001 | xargs kill -9 2>/dev/null; true
	@lsof -ti:3002 | xargs kill -9 2>/dev/null; true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null; true
	@sleep 1
	@echo "Starting auth-service on :3001..."
	@cd services/auth-service && npx tsx watch index.ts &
	@echo "Starting messaging-service on :3002..."
	@cd services/messaging-service && npx tsx watch index.ts &
	@echo "Starting frontend on :5173..."
	@cd frontend && npx vite &
	@echo "✅ All services started. Logs are in the background."

## Kill all local dev services
dev-stop:
	@lsof -ti:3001 | xargs kill -9 2>/dev/null; true
	@lsof -ti:3002 | xargs kill -9 2>/dev/null; true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null; true
	@echo "✅ All dev services stopped."

## Start all services (dev mode with hot-reload)
up:
	docker-compose up --build

## Start services in background
up-d:
	docker-compose up --build -d

## Stop all services
down:
	docker-compose down

## Follow logs from all services
logs:
	docker-compose logs -f

## Follow logs for a specific service (usage: make log s=auth-service)
log:
	docker-compose logs -f $(s)

## Show running containers
ps:
	docker-compose ps

## Stop and remove all containers, volumes, and orphans
clean:
	docker-compose down -v --remove-orphans

# ── Production ───────────────────────────────────────────────────────────────

## Start production stack
prod:
	docker-compose -f docker-compose.prod.yml up -d --build

## Stop production stack
prod-down:
	docker-compose -f docker-compose.prod.yml down

## Follow production logs
prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

## Restart a specific production service (usage: make prod-restart s=auth-service)
prod-restart:
	docker-compose -f docker-compose.prod.yml restart $(s)

# ── Testing ──────────────────────────────────────────────────────────────────

## Run all tests
test: test-auth test-messaging

## Run auth-service tests
test-auth:
	cd services/auth-service && npm test

## Run auth-service tests with coverage
test-auth-cov:
	cd services/auth-service && npm test -- --coverage

## Run messaging-service tests
test-messaging:
	cd services/messaging-service && npm test

## Run messaging-service tests with coverage
test-messaging-cov:
	cd services/messaging-service && npm test -- --coverage

# ── Linting ──────────────────────────────────────────────────────────────────

## Lint all services
lint:
	cd services/auth-service && npm run lint --if-present
	cd services/messaging-service && npm run lint --if-present
	cd services/file-service && npm run lint --if-present
	cd services/notification-service && npm run lint --if-present

# ── Database ─────────────────────────────────────────────────────────────────

## Run Prisma migrations (dev)
migrate:
	cd services/auth-service && npx prisma migrate dev --schema=src/prisma/schema.prisma

## Deploy Prisma migrations (prod)
migrate-deploy:
	cd services/auth-service && npx prisma migrate deploy --schema=src/prisma/schema.prisma

## Seed the database with demo data
seed:
	cd services/auth-service && npx ts-node prisma/seed.ts

## Open Prisma Studio
studio:
	cd services/auth-service && npx prisma studio --schema=src/prisma/schema.prisma

# ── Shell Access ─────────────────────────────────────────────────────────────

## Open a shell in auth-service container
shell-auth:
	docker-compose exec auth-service sh

## Open a shell in messaging-service container
shell-messaging:
	docker-compose exec messaging-service sh

## Open a psql session
shell-postgres:
	docker-compose exec postgres psql -U postgres -d chat_platform

## Open a mongo shell
shell-mongo:
	docker-compose exec mongodb mongosh

## Open Redis CLI
shell-redis:
	docker-compose exec redis redis-cli

# ── Build ────────────────────────────────────────────────────────────────────

## Build all Docker images without starting
build:
	docker-compose build

## Build production images
build-prod:
	docker-compose -f docker-compose.prod.yml build

# ── Help ─────────────────────────────────────────────────────────────────────

## Show this help
help:
	@echo ""
	@echo "  Chat Platform — Available Commands"
	@echo "  ════════════════════════════════════════════"
	@echo ""
	@echo "  Development:"
	@echo "    make up              Start all services (dev)"
	@echo "    make up-d            Start in background"
	@echo "    make down            Stop all services"
	@echo "    make logs            Follow all logs"
	@echo "    make log s=<svc>     Follow logs for one service"
	@echo "    make ps              Show running containers"
	@echo "    make clean           Remove everything (containers+volumes)"
	@echo ""
	@echo "  Production:"
	@echo "    make prod            Start production stack"
	@echo "    make prod-down       Stop production stack"
	@echo "    make prod-logs       Follow production logs"
	@echo "    make prod-restart s= Restart a production service"
	@echo ""
	@echo "  Testing:"
	@echo "    make test            Run all tests"
	@echo "    make test-auth       Run auth-service tests"
	@echo "    make test-auth-cov   Auth tests with coverage"
	@echo "    make test-messaging  Messaging tests"
	@echo "    make test-messaging-cov  Messaging tests with coverage"
	@echo ""
	@echo "  Database:"
	@echo "    make migrate         Run Prisma migrations (dev)"
	@echo "    make migrate-deploy  Deploy migrations (prod)"
	@echo "    make seed            Seed demo data"
	@echo "    make studio          Open Prisma Studio"
	@echo ""
	@echo "  Shells:"
	@echo "    make shell-auth      Shell into auth-service"
	@echo "    make shell-messaging Shell into messaging-service"
	@echo "    make shell-postgres  Open psql session"
	@echo "    make shell-mongo     Open mongo shell"
	@echo "    make shell-redis     Open Redis CLI"
	@echo ""
	@echo "  Build:"
	@echo "    make build           Build all dev images"
	@echo "    make build-prod      Build all prod images"
	@echo ""
