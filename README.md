# 💬 InsTalk — Real-Time Chat & Collaboration Platform

A production-ready, microservices-based real-time chat platform built with **TypeScript**, **React**, **Socket.IO**, **gRPC**, and **Docker**.

> 🌐 **Live Demo**: [https://real-time-chat-and-c-git-2f035e-sontudas17102003-9041s-projects.vercel.app](https://real-time-chat-and-c-git-2f035e-sontudas17102003-9041s-projects.vercel.app)

---

## ✨ Features

- **Real-time Messaging** — Instant message delivery via WebSockets (Socket.IO)
- **End-to-End Encryption** — AES-256-GCM encryption with LZ4 compression via a C++ gRPC engine
- **Google OAuth** — One-click sign-in with Google
- **Workspaces & Channels** — Create team workspaces with public/private channels
- **Online Presence** — Live online/offline status for all users
- **Message Reactions** — React to messages with emojis
- **File Uploads** — Share images and files via MinIO (S3-compatible) storage
- **Push Notifications** — In-app notifications via RabbitMQ event bus
- **Profile Management** — Avatar uploads, bio, and user settings
- **Dark Mode UI** — Sleek, modern dark-themed interface

---

## 🏗️ Architecture

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
     │  Socket.IO    │  │  Multer  │  │  RabbitMQ       │
     │  MongoDB      │  │  MinIO   │  │  Prisma         │
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
| **Notification Service** | 3004 | Express, RabbitMQ, Prisma | Push notifications, in-app notifications |
| **Frontend** | 5173 | React 18, TypeScript, Vite, Tailwind CSS | SPA with real-time chat UI |

### Infrastructure

| Component | Purpose |
|-----------|---------|
| **PostgreSQL 16** | User data, workspaces, channels (auth + file + notification) |
| **MongoDB 7** | Messages, presence data |
| **Redis 7** | JWT blacklist, refresh tokens, Socket.IO pub/sub adapter |
| **RabbitMQ 3.13** | Event bus between messaging → notification service |
| **MinIO** | S3-compatible object storage for file uploads |
| **Nginx** | Reverse proxy, WebSocket upgrade |

---

## 🚀 How to Run Locally

### Prerequisites

Make sure you have these installed on your machine:

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) v2+
- [Node.js](https://nodejs.org/) 20+ and **npm**
- [Git](https://git-scm.com/)

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Shouvik103/Real-time-chat-and-collaboration-platform.git
cd Real-time-chat-and-collaboration-platform/chat-platform
```

### Step 2 — Configure Environment Variables

```bash
cp .env.example .env
```

Open the `.env` file and replace all `CHANGE_ME_*` values:

| Variable | What to Put |
|----------|-------------|
| `POSTGRES_PASSWORD` | Any strong password (e.g. `MyP0stgres!2026`) |
| `MONGO_INITDB_ROOT_PASSWORD` | Any strong password |
| `REDIS_PASSWORD` | Any strong password |
| `RABBITMQ_DEFAULT_PASS` | Any strong password |
| `MINIO_ROOT_PASSWORD` | Min 8 characters |
| `JWT_SECRET` | A random 32+ character string |
| `JWT_REFRESH_SECRET` | A different random 32+ character string |
| `MASTER_KEY` | A 64-character hex string |

> **⚠️ Important**: After changing passwords, you must also update the connection URLs that contain those passwords:
> - `DATABASE_URL` — update the password in the PostgreSQL connection string
> - `MONGO_URI` / `MONGODB_URI` — update the password in both MongoDB connection strings
> - `REDIS_URL` — update the password in the Redis connection string
> - `RABBITMQ_URL` — update the password in the RabbitMQ connection string

**Google OAuth (optional):**
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add `http://localhost` to **Authorized JavaScript origins**
4. Add `http://localhost/api/auth/google/callback` to **Authorized redirect URIs**
5. Copy the Client ID and Client Secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your `.env`

### Step 3 — Start All Infrastructure

This will spin up PostgreSQL, MongoDB, Redis, RabbitMQ, and MinIO:

```bash
docker-compose up -d
```

Wait about 30 seconds, then verify all containers are healthy:

```bash
docker-compose ps
```

All containers should show `healthy` status.

### Step 4 — Install Dependencies

```bash
# Auth Service
cd services/auth-service && npm install && cd ../..

# Messaging Service
cd services/messaging-service && npm install && cd ../..

# File Service
cd services/file-service && npm install && cd ../..

# Notification Service
cd services/notification-service && npm install && cd ../..

# Frontend
cd frontend && npm install && cd ..
```

### Step 5 — Run Database Migrations

```bash
# Auth Service (creates users, workspaces, channels tables)
cd services/auth-service
npx prisma generate --schema=src/prisma/schema.prisma
npx prisma migrate dev --schema=src/prisma/schema.prisma
cd ../..

# File Service
cd services/file-service
npx prisma generate --schema=src/prisma/schema.prisma
npx prisma migrate dev --schema=src/prisma/schema.prisma
cd ../..

# Notification Service
cd services/notification-service
npx prisma generate --schema=src/prisma/schema.prisma
npx prisma migrate dev --schema=src/prisma/schema.prisma
cd ../..
```

### Step 6 — Seed Demo Data (Optional)

```bash
cd services/auth-service
npx ts-node prisma/seed.ts
cd ../..
```

This creates 3 demo accounts you can use to test:

| Email | Password | Role |
|-------|----------|------|
| `alice@demo.com` | `Demo@Pass1` | Workspace Owner |
| `bob@demo.com` | `Demo@Pass1` | Team Member |
| `charlie@demo.com` | `Demo@Pass1` | Team Member |

### Step 7 — Start All Services

Open **5 separate terminal windows** and run one command in each:

**Terminal 1 — Auth Service:**
```bash
cd services/auth-service && npm run dev
```

**Terminal 2 — Messaging Service:**
```bash
cd services/messaging-service && npm run dev
```

**Terminal 3 — File Service:**
```bash
cd services/file-service && npm run dev
```

**Terminal 4 — Notification Service:**
```bash
cd services/notification-service && npm run dev
```

**Terminal 5 — Frontend:**
```bash
cd frontend && npm run dev
```

### Step 8 — Open the App

Open your browser and go to:

🔗 **http://localhost:5173**

Register a new account or use the demo credentials from Step 6. That's it — you're chatting! 🎉

---

## 📂 Project Structure

```
chat-platform/
├── .github/workflows/ci-cd.yml    # GitHub Actions CI/CD
├── docker-compose.yml             # Infrastructure (databases, queues)
├── docker-compose.prod.yml        # Production stack
├── Makefile                       # Shortcut commands
├── .env.example                   # Environment variable template
├── nginx/
│   ├── nginx.conf                 # Dev reverse proxy config
│   └── nginx.prod.conf            # Production config (SSL)
├── frontend/                      # React SPA
│   ├── src/
│   │   ├── api/                   # Axios API clients
│   │   ├── components/            # UI components
│   │   ├── hooks/                 # Custom hooks (useSocket, useAuth)
│   │   ├── pages/                 # Route pages
│   │   ├── store/                 # Zustand state management
│   │   └── types/                 # TypeScript interfaces
│   └── ...
└── services/
    ├── auth-service/              # Authentication & user management
    │   ├── src/prisma/schema.prisma
    │   ├── src/
    │   │   ├── controllers/
    │   │   ├── middleware/
    │   │   ├── routes/
    │   │   ├── services/
    │   │   └── validators/
    │   └── tests/
    ├── messaging-service/         # Real-time messaging
    │   ├── src/
    │   │   ├── models/
    │   │   ├── routes/
    │   │   ├── services/
    │   │   └── socket/
    │   └── tests/
    ├── encryption-engine/         # C++ gRPC encryption
    ├── file-service/              # File upload & processing
    └── notification-service/      # Push notifications
```

---

## 🧰 Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS, Zustand, React Query |
| **Backend** | Node.js 20, Express, TypeScript, Socket.IO |
| **Encryption** | C++17, gRPC, OpenSSL (AES-256-GCM), LZ4 |
| **Databases** | PostgreSQL 16, MongoDB 7, Redis 7 |
| **Message Broker** | RabbitMQ 3.13 |
| **Object Storage** | MinIO (S3-compatible) |
| **Auth** | JWT (access + refresh rotation), bcrypt, Passport.js (Google, GitHub OAuth) |
| **Proxy** | Nginx (reverse proxy, WebSocket support) |
| **CI/CD** | GitHub Actions, Docker, ghcr.io |
| **ORM** | Prisma (PostgreSQL), Mongoose (MongoDB) |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
