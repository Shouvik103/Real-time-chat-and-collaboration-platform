# =============================================================================
# Makefile — Chat Platform Development & Management Commands
# =============================================================================

.PHONY: dev dev-stop infra-up infra-down logs ps clean test lint migrate seed studio deploy help

# ── Deployment ───────────────────────────────────────────────────────────────

## Deploy backend to AWS EC2 (syncs code, runs migrations, restarts PM2)
deploy:
	./deploy-backend.sh


# ── Development ──────────────────────────────────────────────────────────────

## Start infrastructure (PostgreSQL, MongoDB, Redis)
infra-up:
	docker-compose up -d

## Stop infrastructure
infra-down:
	docker-compose down

## Start all local development services (backend + frontend)
dev:
	@echo "Killing any processes on ports 3001, 5173..."
	@lsof -ti:3001 | xargs kill -9 2>/dev/null; true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null; true
	@sleep 1
	@echo "Starting unified backend on :3001..."
	@cd services/auth-service && node --watch index.js &
	@echo "Starting frontend on :5173..."
	@cd frontend && npx vite &
	@echo "✅ Backend and frontend started. Logs are in the background."

## Kill all local dev services
dev-stop:
	@lsof -ti:3001 | xargs kill -9 2>/dev/null; true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null; true
	@echo "✅ All dev services stopped."

## Show running infrastructure containers
ps:
	docker-compose ps

## Follow infrastructure logs
logs:
	docker-compose logs -f

## Stop and remove all containers and volumes
clean:
	docker-compose down -v --remove-orphans

# ── Testing & Quality ────────────────────────────────────────────────────────

## Run backend tests
test:
	cd services/auth-service && npm test

## Run backend tests with coverage
test-cov:
	cd services/auth-service && npm test -- --coverage

## Lint all code
lint:
	cd services/auth-service && npm run lint --if-present
	cd frontend && npm run lint --if-present

## Build frontend
build-frontend:
	cd frontend && npm run build

# ── Database ─────────────────────────────────────────────────────────────────

## Run Prisma migrations (dev)
migrate:
	cd services/auth-service && npx prisma migrate dev --schema=src/prisma/schema.prisma

## Deploy Prisma migrations
migrate-deploy:
	cd services/auth-service && npx prisma migrate deploy --schema=src/prisma/schema.prisma

## Seed the database with demo data
seed:
	cd services/auth-service && node prisma/seed.js

## Open Prisma Studio
studio:
	cd services/auth-service && npx prisma studio --schema=src/prisma/schema.prisma

# ── Shell Access ─────────────────────────────────────────────────────────────

## Open a psql session
shell-postgres:
	docker-compose exec postgres psql -U chat_admin -d chat_platform

## Open a mongo shell
shell-mongo:
	docker-compose exec mongodb mongosh -u chat_admin -p chat_password --authenticationDatabase admin

## Open Redis CLI
shell-redis:
	docker-compose exec redis redis-cli -a chat_password

# ── Help ─────────────────────────────────────────────────────────────────────

## Show this help
help:
	@echo ""
	@echo "  Chat Platform — Available Commands"
	@echo "  ════════════════════════════════════════════"
	@echo ""
	@echo "  Infrastructure:"
	@echo "    make infra-up        Start Postgres, MongoDB, Redis in Docker"
	@echo "    make infra-down      Stop Postgres, MongoDB, Redis"
	@echo "    make ps              Show running containers"
	@echo "    make logs            Follow database logs"
	@echo "    make clean           Remove all containers and database volumes"
	@echo ""
	@echo "  Development:"
	@echo "    make dev             Start backend (:3001) and frontend (:5173)"
	@echo "    make dev-stop        Stop backend and frontend processes"
	@echo ""
	@echo "  Database:"
	@echo "    make migrate         Run Prisma migrations"
	@echo "    make seed            Seed demo data"
	@echo "    make studio          Open Prisma Studio (database GUI)"
	@echo ""
	@echo "  Testing & Quality:"
	@echo "    make test            Run backend tests"
	@echo "    make build-frontend  Build frontend bundle"
	@echo "    make lint            Lint backend and frontend"
	@echo ""
	@echo "  Database Shells:"
	@echo "    make shell-postgres  Connect to PostgreSQL"
	@echo "    make shell-mongo     Connect to MongoDB"
	@echo "    make shell-redis     Connect to Redis"
	@echo ""
