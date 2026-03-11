# Real-Time Chat & Collaboration Platform

A production-ready, microservices-based real-time chat platform built with **TypeScript**, **React**, **Socket.IO**, **gRPC**, and **Docker**.

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│    Nginx     │────▶│  Auth Service    │
│  React + TS  │     │  (Reverse    │     │  Express + Prisma│
│  Vite + TW   │     │   Proxy)     │     │  PostgreSQL      │
└──────────────┘     └──────┬───────┘     └──────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
     ┌────────▼──────┐  ┌──▼───────┐  ┌──▼──────────────┐
     │  Messaging    │  │  File    │  │  Notification   │
     │  Service      │  │  Service │  │  Service        │
     │  Socket.IO    │  │  Multer  │  │  Firebase + FCM │
     │  MongoDB      │  │  MinIO   │  │  RabbitMQ       │
     └───────┬───────┘  │  Sharp   │  └─────────────────┘
             │          └──────────┘
     ┌───────▼───────┐
     │  Encryption   │
     │  Engine (C++) │
     │  gRPC + AES   │
     │  256-GCM      │
     └───────────────┘
```

### Services

| Service | Port | Stack | Description |
|---------|------|-------|-------------|
| **Auth Service** | 3001 | Express, Prisma, PostgreSQL, Redis | User auth, JWT, OAuth (Google/GitHub), workspaces, channels |
| **Messaging Service** | 3002 | Express, Socket.IO, MongoDB, Redis, RabbitMQ | Real-time messaging, typing indicators, presence, reactions |
| **Encryption Engine** | 50051 | C++, gRPC, OpenSSL, LZ4 | AES-256-GCM encryption with LZ4 compression |
| **File Service** | 3003 | Express, Multer, Sharp, MinIO, Prisma | File upload/download, image processing, thumbnails |
| **Notification Service** | 3004 | Express, RabbitMQ, Firebase/FCM, Prisma | Push notifications, in-app notifications, email |
| **Frontend** | 5173 (dev) / 80 (prod) | React 18, TypeScript, Vite, Tailwind CSS | SPA with real-time chat UI |

### Infrastructure

| Component | Purpose |
|-----------|---------|
| **PostgreSQL 16** | User data, workspaces, channels (auth + file + notification) |
| **MongoDB 7** | Messages, presence data |
| **Redis 7** | JWT blacklist, refresh tokens, Socket.IO pub/sub adapter |
| **RabbitMQ 3.13** | Event bus between messaging → notification service |
| **MinIO** | S3-compatible object storage for file uploads |
| **Nginx** | Reverse proxy, SSL termination, rate limiting, WebSocket upgrade |

---

## Quick Start

### Prerequisites

- **Docker** & **Docker Compose** v2+
- **Node.js** 20+ and **npm** (for local development)
- **Make** (optional, for shortcut commands)

### 1. Clone the repository

```bash
git clone https://github.com/Shouvik103/Real-time-chat-and-collaboration-platform.git
cd Real-time-chat-and-collaboration-platform/chat-platform
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values (see `.env.example` for all required variables).

### 3. Start with Docker (development)

```bash
# Start all infrastructure + services
make up

# Or without Make:
docker-compose up --build
```

### 4. Run database migrations

```bash
# In a new terminal
make migrate

# Or manually:
cd services/auth-service
npx prisma migrate dev --schema=src/prisma/schema.prisma
```

### 5. Seed demo data (optional)

```bash
make seed

# Demo accounts (password: Demo@Pass1):
#   alice@demo.com  — workspace owner
#   bob@demo.com    — team member
#   charlie@demo.com — team member
```

### 6. Open the app

- **Frontend**: http://localhost:5173
- **Auth API**: http://localhost:3001/health
- **Messaging API**: http://localhost:3002/health
- **File API**: http://localhost:3003/health
- **Notification API**: http://localhost:3004/health

---

## Production Deployment

### Using Docker Compose

```bash
# Create production env file
cp .env.example .env.prod
# Edit .env.prod with production values (strong passwords, real domains, etc.)

# Start production stack
make prod

# Or manually:
docker-compose -f docker-compose.prod.yml up -d --build
```

### SSL/TLS Setup

1. Update `nginx/nginx.prod.conf` — replace `chat.example.com` with your domain
2. Obtain certificates with [certbot](https://certbot.eff.org/):
   ```bash
   certbot certonly --webroot -w /var/www/certbot -d yourdomain.com
   ```
3. Mount certificate volume in `docker-compose.prod.yml`

### CI/CD

The project includes a GitHub Actions pipeline (`.github/workflows/ci-cd.yml`) that:

1. **Lint & Typecheck** — All services in parallel (matrix strategy)
2. **Test** — Auth + Messaging service tests with coverage
3. **Build & Push** — Docker images to `ghcr.io` (on main branch)
4. **Deploy** — SSH to production server, pull images, run migrations, restart

Required GitHub Secrets:
- `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`

---

## API Reference

### Auth Service (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register a new account |
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/logout` | Yes | Logout (blacklist token) |
| POST | `/api/auth/refresh` | No | Rotate refresh token |
| GET | `/api/auth/me` | Yes | Get current user + workspaces |
| GET | `/api/auth/google` | No | Start Google OAuth flow |
| GET | `/api/auth/github` | No | Start GitHub OAuth flow |

### User Service (`/api/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/profile/:userId` | Yes | Get user profile |
| PATCH | `/api/users/profile` | Yes | Update own profile |
| PATCH | `/api/users/profile/avatar` | Yes | Update avatar URL |
| GET | `/api/users/workspaces` | Yes | List user's workspaces |
| POST | `/api/users/workspaces` | Yes | Create a workspace |
| GET | `/api/users/workspaces/:id/channels` | Yes | List channels in workspace |
| POST | `/api/users/workspaces/:id/channels` | Yes | Create a channel |

### Messages Service (`/api/messages`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/messages/:channelId` | No* | Get messages (cursor pagination) |

*Query params: `?cursor=<lastId>&limit=20`

### WebSocket Events (Socket.IO)

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `send_message` | `{ channelId, content, type?, fileId? }` | Send a message |
| `edit_message` | `{ messageId, content }` | Edit a message |
| `delete_message` | `{ messageId }` | Soft-delete a message |
| `react_to_message` | `{ messageId, emoji }` | Toggle reaction |
| `join_channel` | `{ channelId }` | Join a channel room |
| `leave_channel` | `{ channelId }` | Leave a channel room |
| `typing_start` | `{ channelId }` | Start typing indicator |
| `typing_stop` | `{ channelId }` | Stop typing indicator |
| `user_online` | — | Signal online status |
| `user_offline` | — | Signal offline status |

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | `Message` | New message in channel |
| `message_edited` | `{ messageId, content, editedAt }` | Message was edited |
| `message_deleted` | `{ messageId }` | Message was deleted |
| `reaction_updated` | `{ messageId, reactions }` | Reactions changed |
| `user_typing` | `{ userId, username, channelId }` | User is typing |
| `user_stop_typing` | `{ userId, username, channelId }` | User stopped typing |
| `user_online` | `{ userId }` | User came online |
| `user_offline` | `{ userId }` | User went offline |
| `error_event` | `{ event, message }` | Operation failed |

**Connection:**
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3002', {
  auth: { token: '<JWT access token>' },
  transports: ['websocket'],
});
```

---

## Testing

```bash
# Run all tests
make test

# Auth service with coverage
make test-auth-cov

# Messaging service with coverage
make test-messaging-cov

# Or directly:
cd services/auth-service && npm test -- --coverage
cd services/messaging-service && npm test -- --coverage
```

### Test Structure

```
services/auth-service/tests/
├── unit/
│   ├── jwt.service.test.ts         # JWT sign, verify, blacklist, rotation
│   ├── password.service.test.ts    # bcrypt hash & compare
│   └── auth.validator.test.ts      # Zod schema validation
└── integration/
    ├── auth.routes.test.ts         # Register, login, logout, refresh, me
    └── user.routes.test.ts         # Profile, workspaces, channels

services/messaging-service/tests/
├── unit/
│   ├── message.service.test.ts     # CRUD, reactions, pagination
│   └── encryption.service.test.ts  # gRPC encrypt/decrypt mock
└── integration/
    ├── message.routes.test.ts      # REST pagination endpoint
    └── socket.test.ts              # Socket.IO auth, events, typing
```

---

## Make Commands

```bash
make help          # Show all available commands
make up            # Start dev stack
make down          # Stop dev stack
make prod          # Start production stack
make test          # Run all tests
make test-auth-cov # Auth tests with coverage
make migrate       # Run Prisma migrations
make seed          # Seed demo data
make studio        # Open Prisma Studio
make shell-auth    # Shell into auth container
make shell-postgres # Open psql session
make clean         # Remove everything
```

---

## Project Structure

```
chat-platform/
├── .github/workflows/ci-cd.yml    # GitHub Actions CI/CD
├── docker-compose.yml             # Development stack
├── docker-compose.prod.yml        # Production stack
├── Makefile                       # Dev/prod shortcut commands
├── nginx/
│   ├── nginx.conf                 # Dev reverse proxy
│   └── nginx.prod.conf            # Prod (SSL, security headers)
├── frontend/                      # React SPA
│   ├── Dockerfile
│   ├── src/
│   │   ├── api/                   # Axios clients
│   │   ├── components/            # UI components
│   │   ├── hooks/                 # Custom hooks (useSocket, useMessages)
│   │   ├── pages/                 # Route pages
│   │   ├── stores/                # Zustand state management
│   │   └── types/                 # TypeScript interfaces
│   └── ...
└── services/
    ├── auth-service/              # Authentication & user management
    │   ├── Dockerfile
    │   ├── jest.config.js
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   └── seed.ts
    │   ├── src/
    │   │   ├── controllers/
    │   │   ├── middleware/
    │   │   ├── routes/
    │   │   ├── services/
    │   │   └── validators/
    │   └── tests/
    │       ├── unit/
    │       └── integration/
    ├── messaging-service/         # Real-time messaging
    │   ├── Dockerfile
    │   ├── jest.config.js
    │   ├── src/
    │   │   ├── models/
    │   │   ├── routes/
    │   │   ├── services/
    │   │   └── socket/
    │   └── tests/
    │       ├── unit/
    │       └── integration/
    ├── encryption-engine/         # C++ gRPC encryption
    ├── file-service/              # File upload & processing
    └── notification-service/      # Push notifications
```

---

## Troubleshooting

### Common Issues

**Docker containers won't start:**
```bash
# Check for port conflicts
lsof -i :3001 -i :3002 -i :3003 -i :3004 -i :5432 -i :27017 -i :6379

# Rebuild everything from scratch
make clean && make up
```

**Database connection errors:**
```bash
# Ensure PostgreSQL is healthy
docker-compose ps postgres
docker-compose logs postgres

# Re-run migrations
make migrate
```

**Socket.IO connection fails:**
- Ensure the JWT token is valid and not expired
- Check CORS settings in `SOCKET_CORS_ORIGIN`
- Verify WebSocket upgrade is allowed through proxy

**Tests failing:**
```bash
# Install test dependencies first
cd services/auth-service && npm install
cd services/messaging-service && npm install

# Run with verbose output
cd services/auth-service && npx jest --verbose
```

**Redis connection refused:**
```bash
# Check Redis is running
docker-compose logs redis

# Verify REDIS_URL env var matches docker-compose service name
# Should be: redis://:password@redis:6379
```

**Prisma schema out of sync:**
```bash
cd services/auth-service
npx prisma generate --schema=src/prisma/schema.prisma
npx prisma migrate dev --schema=src/prisma/schema.prisma
```

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS, Zustand, React Query |
| **Backend** | Node.js 20, Express, TypeScript, Socket.IO |
| **Encryption** | C++17, gRPC, OpenSSL (AES-256-GCM), LZ4 |
| **Databases** | PostgreSQL 16, MongoDB 7, Redis 7 |
| **Message Broker** | RabbitMQ 3.13 |
| **Object Storage** | MinIO (S3-compatible) |
| **Auth** | JWT (access + refresh rotation), bcrypt, Passport.js (Google, GitHub OAuth) |
| **Proxy** | Nginx (reverse proxy, SSL, rate limiting, WebSocket) |
| **CI/CD** | GitHub Actions, Docker, ghcr.io |
| **ORM** | Prisma (PostgreSQL), Mongoose (MongoDB) |

---

## License

This project is for educational and portfolio purposes.
