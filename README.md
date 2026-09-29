<div align="center">

  # 💬 InsTalk
  ### Real-Time Chat & Collaboration Platform

  <p align="center">
    A high-throughput, enterprise-grade collaboration platform engineered with <strong>React 18</strong>, <strong>Node.js</strong>, <strong>Socket.IO</strong>, <strong>Polyglot Persistence</strong>, and a dedicated <strong>C++17 AES-256-GCM / LZ4 Encryption Engine</strong> over <strong>gRPC</strong>.
  </p>

  <p align="center">
    <a href="https://instalk.shouvik.tech" target="_blank">
      <img src="https://img.shields.io/badge/🚀_Live_Demo-instalk.shouvik.tech-00C853?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-0969DA?style=for-the-badge" alt="License" />
    </a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React 18" />
    <img src="https://img.shields.io/badge/Node.js_20-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 20" />
    <img src="https://img.shields.io/badge/Socket.IO_4-010101?style=flat-square&logo=socketdotio&logoColor=white" alt="Socket.IO" />
    <img src="https://img.shields.io/badge/C++17-00599C?style=flat-square&logo=cplusplus&logoColor=white" alt="C++17" />
    <img src="https://img.shields.io/badge/gRPC_Protobuf-244C5A?style=flat-square&logo=grpc&logoColor=white" alt="gRPC" />
    <img src="https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
    <img src="https://img.shields.io/badge/MongoDB_7-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB 7" />
    <img src="https://img.shields.io/badge/Redis_7-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis 7" />
    <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
    <img src="https://img.shields.io/badge/AWS_EC2-FF9900?style=flat-square&logo=amazonec2&logoColor=white" alt="AWS EC2" />
  </p>

  <p align="center">
    <a href="#-key-features">Key Features</a> •
    <a href="#-architecture--system-design">Architecture</a> •
    <a href="#-polyglot-persistence-layer">Data Layer</a> •
    <a href="#-c-encryption-engine--security">Security Engine</a> •
    <a href="#-live-demo--test-accounts">Demo Accounts</a> •
    <a href="#-technology-stack">Tech Stack</a> •
    <a href="#-license">License</a>
  </p>

</div>

---

## 📌 Overview

**InsTalk** is a production-deployed, cloud-native real-time communication platform designed to balance ultra-low latency messaging with cryptographic data security. 

Unlike traditional monolith chat apps that perform CPU-intensive encryption directly in the JavaScript event loop, InsTalk offloads cryptographic operations and data compression to a bare-metal **C++17 microservice** over high-throughput **binary gRPC**. Combined with a **polyglot persistence architecture** (PostgreSQL, MongoDB, and Redis), InsTalk delivers sub-50ms message distribution, fine-grained access control, and complete zero-knowledge data protection at rest.

---

## ✨ Key Features

### ⚡ Ultra-Low Latency Messaging
* **Bi-directional WebSockets** — Event-driven duplex communication powered by Socket.IO with sub-50ms round-trip delivery.
* **Typing Indicators & Live Presence** — Real-time user typing status and heartbeat presence tracking (Online, Away, Offline) via distributed Redis key expiration.
* **Interactive Emoji Reactions** — Instant, optimistic message reactions synced across channel subscribers in real time.
* **Message Lifecycle Management** — Real-time message editing, optimistic UI updates, and soft-deletion tombstoning.

### 🔐 Bare-Metal Cryptographic Engine
* **gRPC C++ Encryption Microservice** — Native C++17 microservice handling **AES-256-GCM** authenticated encryption with **LZ4** high-speed compression over port `50051`.
* **Zero Plaintext at Rest** — All chat payloads stored in MongoDB are encrypted with cryptographically secure 12-byte initialization vectors (IVs) and 16-byte authentication tags.
* **AEAD Tamper Protection** — Any unauthorized alteration to stored ciphertexts triggers instant authentication failure during decryption.

### 🏢 Multi-Tenant Workspaces & Channels
* **Hierarchical Organization** — Create and manage distinct workspaces, public channels, private invitation-only channels, and 1-on-1 direct messages (DMs).
* **Role-Based Access Control** — Granular permissions across Workspace Owners, Admins, and Members.
* **Instant Invite Engine** — Secure, shareable workspace invitation codes for team onboarding.

### 🛡️ Enterprise Security & Authentication
* **Dual-Token Rotation** — Secure HTTP-only cookies containing short-lived JWT access tokens and rotating refresh tokens.
* **Multi-Provider Auth** — Native email/password authentication (salted bcrypt hashing) alongside **Google OAuth 2.0**.
* **Defense in Depth** — Rate limiting via `express-rate-limit`, strict HTTP security headers via `helmet`, and CORS origin validation.

### 🎨 Modern Dark Glassmorphic UI
* **Responsive Interface** — Tailored dark theme crafted with React 18, Tailwind CSS, and Lucide / Heroicons.
* **Ambient Canvas Effects** — Custom interactive particle canvas background with physics-based mouse repelling.
* **State Management** — Synchronized UI state powered by **Zustand** and cache-driven data queries via **TanStack React Query**.

---

## 🏗️ Architecture & System Design

InsTalk employs a distributed, cloud-native topology separating static edge delivery from stateful backend services and isolated computational microservices.

```
                                          INTERNET
                                             │
                 ┌───────────────────────────┴───────────────────────────┐
                 ▼                                                       ▼
        ┌─────────────────┐                                    ┌───────────────────┐
        │   Vercel Edge   │                                    │   AWS EC2 Cloud   │
        │   (Frontend)    │                                    │ (Stockholm Region)│
        │ instalk.        │                                    └─────────┬─────────┘
        │ shouvik.tech    │                                              │
        └────────┬────────┘                                              │ Port 80 / 443
                 │ HTTPS / WSS                                           │
                 └───────────────────────────────────────────┐           ▼
                                                             │  ┌─────────────────┐
                                                             │  │   Caddy Proxy   │
                                                             │  │ (Automated SSL) │
                                                             │  └────────┬────────┘
                                                             │           │ reverse proxy
                                                             ▼           ▼
                                                      ┌──────────────────────────┐
                                                      │  Node.js Unified Backend │
                                                      │    (PM2 Daemon :3001)    │
                                                      │  Auth, Chat & Socket.IO  │
                                                      └────────────┬─────────────┘
                                                                   │
                                                              gRPC │ (Port 50051)
                                                                   ▼
                                                      ┌──────────────────────────┐
                                                      │  C++ Encryption Engine   │
                                                      │ AES-256-GCM + LZ4 Docker │
                                                      └──────────────────────────┘

Databases (Dockerized on AWS EC2):
├── PostgreSQL 16 (Port 5432) — Users, Workspaces, Channels, Memberships (Prisma ORM)
├── MongoDB 7    (Port 27017) — Encrypted Messages, Reactions, Audit Trail (Mongoose)
└── Redis 7      (Port 6379)  — Session Cache, Presence Tracking & Pub/Sub
```

### Infrastructure Summary

| Service | Environment | Port | Technology | Purpose |
| :--- | :--- | :---: | :--- | :--- |
| **Frontend** | Vercel Edge | `443` | React 18, Vite, Tailwind CSS, Zustand | Single-page client deployed globally at edge |
| **Reverse Proxy** | AWS EC2 | `80`, `443` | Caddy Server | Automated Let's Encrypt SSL & WebSocket proxying |
| **Backend Gateway** | AWS EC2 | `3001` | Node.js 20, Express, Socket.IO, PM2 | Unified REST API & real-time WebSocket server |
| **Encryption Engine** | AWS EC2 (Docker) | `50051` | C++17, gRPC, Protobuf, OpenSSL, LZ4 | High-throughput authenticated encryption & compression |
| **PostgreSQL** | AWS EC2 (Docker) | `5432` | PostgreSQL 16 Alpine, Prisma ORM | Relational schema for identities, workspaces & permissions |
| **MongoDB** | AWS EC2 (Docker) | `27017` | MongoDB 7 Community, Mongoose | High-write document store for encrypted message archives |
| **Redis** | AWS EC2 (Docker) | `6379` | Redis 7 Alpine, ioredis | Fast token store, presence heartbeats & Pub/Sub broker |

---

## 🗄️ Polyglot Persistence Layer

InsTalk avoids single-database bottlenecks by delegating operational responsibilities according to data access patterns and durability requirements:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA PERSISTENCE SCHEME                         │
├──────────────────────┬──────────────────────┬──────────────────────────┤
│    PostgreSQL 16     │      MongoDB 7       │         Redis 7          │
│     (Prisma ORM)     │      (Mongoose)      │        (ioredis)         │
├──────────────────────┼──────────────────────┼──────────────────────────┤
│ • User Profiles      │ • Encrypted Messages │ • Online/Away Heartbeats │
│ • Workspace Entities │ • Reaction Matrices  │ • WebSocket Session Maps │
│ • Channel Metadata   │ • Edit Histories     │ • Token Blacklisting     │
│ • Role Memberships   │ • Delivery Audits    │ • Rate Limit Counters    │
│ (Strict ACID / Rel)  │ (High-Volume Docs)   │ (Sub-millisecond In-Mem) │
└──────────────────────┴──────────────────────┴──────────────────────────┘
```

1. **PostgreSQL 16 (Relational & Identity Layer)**: Manages strict relational contracts such as user authentication records, multi-tenant workspace hierarchies, channel memberships, and invite tokens with referential integrity.
2. **MongoDB 7 (Document & Payload Archive)**: Serves as an append-optimized document store handling high-throughput encrypted messages, emoji reactions, and message audit trails.
3. **Redis 7 (In-Memory State & Pub/Sub)**: Maintains ephemeral presence heartbeats with automated TTL eviction, active socket session mappings, and distributed pub/sub communication.

---

## 🔐 C++ Encryption Engine & Security

A foundational technical differentiator of InsTalk is its dedicated cryptographic microservice written in **C++17**, exposing a low-latency **gRPC** interface to the Node.js application layer.

### Protocol Buffers Interface (`encryption.proto`)

```protobuf
syntax = "proto3";

package encryption;

service EncryptionService {
  rpc Encrypt(EncryptRequest) returns (EncryptResponse);
  rpc Decrypt(DecryptRequest) returns (DecryptResponse);
}

message EncryptRequest {
  string plaintext = 1;
}

message EncryptResponse {
  string ciphertext = 1;  // Base64-encoded ciphertext
  string iv = 2;          // Base64-encoded 12-byte CSPRNG IV
  string auth_tag = 3;    // Base64-encoded 16-byte GCM authentication tag
}

message DecryptRequest {
  string ciphertext = 1;  // Base64-encoded ciphertext
  string iv = 2;          // Base64-encoded 12-byte IV
  string auth_tag = 3;    // Base64-encoded 16-byte GCM authentication tag
}

message DecryptResponse {
  string plaintext = 1;
}
```

### Cryptographic Pipeline

```
[Inbound Message]
       │
       ▼
┌──────────────┐      LZ4      ┌──────────────────┐   OpenSSL EVP   ┌───────────────────────────────┐
│  Plaintext   │ ────────────> │ Compressed Bytes │ ──────────────> │ Base64 Encrypted Payload:     │
│    String    │  Compression  │                  │   AES-256-GCM   │ • Ciphertext  • IV  • AuthTag │
└──────────────┘               └──────────────────┘                 └──────────────┬────────────────┘
                                                                                   │
                                                                                   ▼
                                                                     [Persisted to MongoDB at Rest]
```

1. **Pre-Encryption Compression**: Raw message strings undergo high-speed **LZ4 compression** prior to cipher operations, reducing network transport size and storage footprint.
2. **Authenticated Encryption (AEAD)**: The C++ engine utilizes OpenSSL's `EVP_aes_256_gcm` cipher. For every payload, a cryptographically secure 12-byte initialization vector (IV) is generated at runtime using hardware entropy.
3. **Integrity Verification**: Decryption verifies the 16-byte authentication tag before any decompression occurs. If a record has been tampered with or modified in the database, decryption immediately rejects the payload, preventing padding-oracle and bit-flipping attacks.

---

## 🌐 Live Demo & Test Accounts

The platform is running live in production at:  
👉 **[https://instalk.shouvik.tech](https://instalk.shouvik.tech)**

To evaluate real-time multi-user synchronization, open two separate browser windows (or one Incognito window) and sign in using the pre-seeded accounts below:

| Account | Email | Password | Role | Default Workspaces |
| :--- | :--- | :--- | :--- | :--- |
| **Alice Walker** | `alice@demo.com` | `Demo@Pass1` | Workspace Owner | *Engineering, Design* |
| **Bob Martinez** | `bob@demo.com` | `Demo@Pass1` | Workspace Admin | *Design, Engineering* |
| **Charlie Kim** | `charlie@demo.com` | `Demo@Pass1` | Team Member | *Engineering* |

> **Note**: You may also register a new account via standard email/password or use **Google OAuth 2.0** directly from the login page.

---

## 💻 Technology Stack

<div align="center">

| Tier | Technologies |
| :--- | :--- |
| **Frontend Client** | React 18, Vite 5, Tailwind CSS 3, Zustand, TanStack React Query 5, Socket.IO Client, Heroicons |
| **Backend & Gateway** | Node.js 20, Express, Socket.IO 4, PM2 Daemon, Zod Runtime Validation, Passport.js, JWT, Winston |
| **Encryption Engine** | C++17, gRPC, Protocol Buffers 3, OpenSSL 3 (`EVP_aes_256_gcm`), LZ4 Compression, CMake |
| **Data & Cache Layer**| PostgreSQL 16 (Prisma ORM), MongoDB 7 Community (Mongoose), Redis 7 Alpine (`ioredis`) |
| **Cloud & Infrastructure**| AWS EC2 (t3.small, Stockholm), Docker & Docker Compose, Caddy Reverse Proxy, Vercel Edge |

</div>

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — see the LICENSE file for details.

---

<div align="center">
  <sub>Built with care by <a href="https://github.com/Shouvik103">Shouvik Das</a> • Deployed live at <a href="https://instalk.shouvik.tech">instalk.shouvik.tech</a></sub>
</div>
