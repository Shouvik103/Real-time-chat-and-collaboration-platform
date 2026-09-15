# InsTalk — Real-Time Chat & Collaboration Platform

A modern, full-stack real-time collaboration platform featuring **React 18**, **Node.js/Express**, **Socket.IO**, **PostgreSQL**, **MongoDB**, **Redis**, and a high-performance **C++ Encryption Engine (gRPC)**.

> **Live Website**: [https://instalk.shouvik.tech](https://instalk.shouvik.tech)

---

## Key Features & Capabilities

- **Instant Real-time Messaging** — Bi-directional WebSocket communication powered by Socket.IO with sub-50ms latency.
- **C++ AES-256-GCM Encryption Engine** — Native C++ encryption microservice with LZ4 compression connected via high-throughput gRPC over port 50051. Messages are encrypted at rest in MongoDB.
- **Multi-Tenant Workspaces & Channels** — Create and manage workspaces, public/private channels, direct messages (DMs), and shareable invite codes.
- **Real-Time Presence System** — Live user status updates (Online, Away, Offline) with automated heartbeat tracking via Redis.
- **Live Typing Indicators** — Real-time visual feedback when members in a channel are composing messages.
- **Interactive Emoji Reactions** — Expressive message reactions synced across all connected clients in real time.
- **Message Editing & Soft Deletion** — Edit sent messages or delete them with instant updates pushed to all channel members.
- **Multi-Provider Authentication** — JWT access/refresh token rotation, bcrypt password hashing, and Google OAuth 2.0 sign-in.
- **Modern Dark Glassmorphic UI** — Responsive interface built with React, Tailwind CSS, Lucide icons, and interactive particle canvas animations.

---

## Architecture & Infrastructure

```
                                          INTERNET
                                             │
                 ┌───────────────────────────┴───────────────────────────┐
                 ▼                                                       ▼
        ┌─────────────────┐                                    ┌───────────────────┐
        │  Vercel Edge    │                                    │   AWS EC2 Cloud   │
        │   (Frontend)    │                                    │ (Stockholm Region)│
        │instalk.         │                                    └─────────┬─────────┘
        │shouvik.tech     │                                              │
        └────────┬────────┘                                              │ Port 80 / 443
                 │ HTTPS / WSS                                           │
                 └───────────────────────────────────────────┐           ▼
                                                             │  ┌─────────────────┐
                                                             │  │ Caddy Proxy     │
                                                             │  │ (Automated SSL) │
                                                             │  └────────┬────────┘
                                                             │           │ reverse proxy
                                                             ▼           ▼
                                                      ┌──────────────────────────┐
                                                      │  Node.js Unified Backend │
                                                      │     (PM2 Daemon :3001)   │
                                                      │ Auth, Chat & Socket.IO   │
                                                      └────────────┬─────────────┘
                                                                   │
                                                              gRPC │ (Port 50051)
                                                                   ▼
                                                      ┌──────────────────────────┐
                                                      │  C++ Encryption Engine   │
                                                      │ AES-256-GCM + LZ4 (Docker│
                                                      └──────────────────────────┘

Databases (Dockerized on AWS EC2):
├── PostgreSQL 16 (Port 5432) — Users, Workspaces, Channels, Memberships (Prisma ORM)
├── MongoDB 7    (Port 27017) — Encrypted Messages, Reactions, Presence (Mongoose)
└── Redis 7      (Port 6379)  — Session Cache, Pub/Sub & Presence Tracking
```

### Infrastructure Summary

| Service | Host | Port | Technology | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | Vercel Edge | `443` | React 18, Vite, Tailwind CSS | Single-page application at `instalk.shouvik.tech` |
| **Reverse Proxy** | AWS EC2 | `80`, `443` | Caddy Server | Automatic SSL certificates & reverse proxy |
| **Backend API** | AWS EC2 | `3001` | Node.js 20, Express, Socket.IO, PM2 | Unified REST endpoints & WebSocket server |
| **Encryption Engine**| AWS EC2 (Docker) | `50051` | C++17, gRPC, Protobuf, OpenSSL, LZ4 | Message payload encryption/decryption & compression |
| **PostgreSQL** | AWS EC2 (Docker) | `5432` | PostgreSQL 16 Alpine | Relational user identities & workspace schema |
| **MongoDB** | AWS EC2 (Docker) | `27017`| MongoDB 7 | Document store for encrypted chat history |
| **Redis** | AWS EC2 (Docker) | `6379` | Redis 7 Alpine | High-speed cache, token storage, and pub/sub |

---

## Tech Stack Evolution

From its initial prototype to the current cloud production deployment, the platform underwent key architectural modernizations:

1. **Unified Backend Architecture**:
   - Consolidated scattered microservices into a clean, unified Node.js/Express backend (`chat-backend`), drastically reducing operational overhead and memory consumption while eliminating inter-service network hops.
2. **Pure Modern JavaScript**:
   - Converted 100% of codebase to clean, idiomatic JavaScript (`.js` / `.jsx`), removing build pipelines while enforcing strict runtime data contracts using **Zod** schemas.
3. **Cloud-Native Deployment**:
   - Deployed databases and C++ encryption microservice via **Docker Compose** on AWS EC2 (`t3.small`).
   - Configured **2 GB Linux Swap** memory for maximum resilience and zero OOM kills.
   - Deployed **Caddy** for automatic HTTPS & WSS with valid Let's Encrypt certificates, eliminating browser Mixed Content blocking.
   - Hosted frontend on **Vercel** with custom domain routing at `https://instalk.shouvik.tech`.

---

## How to Run Locally

If you want to run or develop on your local machine:

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- [Node.js](https://nodejs.org/) v20+ and **npm**

---

### Step 1 — Clone the Repository
```bash
git clone https://github.com/Shouvik103/Real-time-chat-and-collaboration-platform.git
cd Real-time-chat-and-collaboration-platform/chat-platform
```

---

### Step 2 — Start Databases & Encryption Engine (Docker)
```bash
docker compose up -d
```
Verify containers are running and healthy:
```bash
docker compose ps
```

---

### Step 3 — Start Unified Backend
```bash
cd services/auth-service

# 1. Install dependencies
npm install

# 2. Sync database schema & generate Prisma Client
npx prisma db push --schema=src/prisma/schema.prisma

# 3. Seed demo users & workspaces
node prisma/seed.js

# 4. Start backend
npm run dev
```
Backend will start on `http://localhost:3001`.

---

### Step 4 — Start Frontend
In a new terminal window:
```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Demo Credentials (Pre-seeded)

Use any of these demo accounts to test instant multi-user chat:

| Email | Password | Role | Default Workspaces |
| :--- | :--- | :--- | :--- |
| `alice@demo.com` | `Demo@Pass1` | Workspace Owner | Engineering, Design |
| `bob@demo.com` | `Demo@Pass1` | Workspace Owner / Member | Design, Engineering |
| `charlie@demo.com` | `Demo@Pass1` | Team Member | Engineering |

*(You can also sign up with your own email and password or use Google Sign-In).*

---

## Deployment & Updates Workflow

### Updating the Frontend:
When you make changes to the frontend (`frontend/`):
```bash
git add .
git commit -m "Your frontend feature update"
git push origin main
```
Vercel automatically detects the commit, builds the bundle, and deploys it live to `instalk.shouvik.tech` in ~20 seconds.

---

### Updating the Backend:
When you update backend code (`services/auth-service/`), run the 1-click deploy script:
```bash
./deploy-backend.sh
```
*(or run `make deploy`)*

In 4 seconds, this automated script:
1. Syncs your code to the AWS EC2 instance.
2. Applies any new Prisma schema changes (`prisma db push`).
3. Restarts the backend daemon via PM2.
4. Verifies the live health check endpoint.

---

## Handy Make Commands

| Command | Description |
| :--- | :--- |
| `make deploy` | Deploy backend updates to AWS EC2 in 1 click |
| `make infra-up` | Start PostgreSQL, MongoDB, Redis, and Encryption Engine |
| `make infra-down` | Stop all Docker containers |
| `make dev` | Start backend (:3001) and frontend (:5173) locally |
| `make dev-stop` | Kill local backend and frontend processes |
| `make test` | Run backend Jest test suite |
| `make test-cov` | Run backend tests with coverage report |
| `make seed` | Reseed the database with demo accounts |
| `make studio` | Open Prisma Studio database GUI |
| `make clean` | Stop and remove all Docker containers and volumes |

---

## License

This project is licensed under the [MIT License](LICENSE).
