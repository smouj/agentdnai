<div align="center">

# AgentDNAI

**Verifiable Digital Identity for AI Agents**

[![License: MIT](https://img.shields.io/badge/License-MIT-crimson.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-black?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-black?logo=prisma)](https://www.prisma.io/)

[Installation](#-installation) · [Quick Start](#-quick-start) · [Architecture](#-architecture) · [API Reference](#-api-reference) · [Documentation](https://smouj.github.io/agentdnai)

</div>

---

Every AI agent needs an **identity**. AgentDNAI provides a complete identity and authorization layer — every agent gets a verifiable identity, scoped permissions, temporary tokens and a tamper-evident audit trail.

## Why AgentDNAI?

AI agents read repositories, modify files, create PRs, access secrets and automate infrastructure. Without a proper identity layer, they become hard to control, hard to audit and hard to revoke.

| Without AgentDNAI | With AgentDNAI |
|---|---|
| ❌ Agents operate anonymously | ✅ Every agent has a unique URI + key pair |
| ❌ Agents get blanket access | ✅ Granular allow/deny rules per resource |
| ❌ No record of what agents did | ✅ Hash-chained, append-only audit log |
| ❌ Permanent API keys that leak | ✅ Short-lived, hash-stored tokens only |
| ❌ Production actions unguarded | ✅ Production always requires human approval |

## ✨ Features

- **🔐 Agent Identity** — Unique URI (`agent://owner/runtime/name`), RSA-PSS key pair, and lifecycle status for every agent
- **🛡️ Scoped Permissions** — 47 granular permissions across 9 categories, with ALLOW / DENY / REQUIRES_APPROVAL effects
- **🔑 Temporary Tokens** — SHA-256 hashed, TTL-enforced (60s–24h), raw tokens never stored in the database
- **📜 Audit Trail** — Hash-chained append-only log with integrity verification
- **⚖️ Policy Engine** — Deny-by-default, explicit deny > allow, production requires human approval
- **🔍 Authorization Playground** — Interactive batch authorization checking
- **📊 Risk Scoring** — 7-factor risk assessment (0–100 scale) per agent
- **⚡ Real-time Events** — WebSocket + SSE live security event feed
- **🧩 Quick Setup Wizard** — 3-step agent creation workflow
- **⌨️ Command Palette** — `⌘K` quick navigation and actions
- **📤 Data Export/Import** — Full JSON export and import with skip-existing logic

## 📦 Installation

### Prerequisites

- **Node.js** ≥ 18
- **Bun** ≥ 1.0 (recommended) or npm/yarn/pnpm
- **Git**

### Clone & Install

```bash
# Clone the repository
git clone https://github.com/smouj/agentdnai.git
cd agentdnai

# Install dependencies
bun install
```

### Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your settings (defaults work for development)
# The .env file contains:
#   DATABASE_URL=file:./dev.db    # SQLite for development
#   NEXTAUTH_SECRET=              # Optional: for user auth
#   NEXTAUTH_URL=http://localhost:3000
```

### Database Setup

```bash
# Push the Prisma schema to create the SQLite database
bun run db:push
```

### Start Development Server

```bash
# Start the Next.js dev server on port 3000
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Seed Demo Data (Optional)

Click **"Seed Demo"** in the dashboard, or:

```bash
curl -X POST http://localhost:3000/api/seed
```

This creates 5 demo agents with permissions, tokens, and audit events.

## 🚀 Quick Start

### 1. Create an Agent

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-agent",
    "runtime": "hermes",
    "description": "My first AI agent"
  }'
```

### 2. Grant Permissions

```bash
curl -X POST http://localhost:3000/api/agents/{agentId}/permissions \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "github.repo.read",
    "resource": "github.com/org/*",
    "effect": "ALLOW"
  }'
```

### 3. Issue a Token

```bash
curl -X POST http://localhost:3000/api/tokens/issue \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "{agentId}",
    "scopes": ["github.repo.read"],
    "ttlSeconds": 3600
  }'
```

### 4. Check Authorization

```bash
curl -X POST http://localhost:3000/api/authz/check \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "{agentId}",
    "action": "github.repo.read",
    "resource": "github.com/org/repo"
  }'
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js 16 App                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Landing  │  │ Dashboard│  │ 14+ SPA Views    │  │
│  │   Page    │  │ + Sidebar│  │ (Agents, Audit,  │  │
│  │           │  │          │  │  Tokens, etc.)   │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────┤
│                    API Routes (26+)                  │
│  ┌─────────┐ ┌──────────┐ ┌──────┐ ┌───────────┐  │
│  │ Agents  │ │ Tokens   │ │Authz │ │  Audit    │  │
│  │ CRUD+   │ │ Issue/   │ │Check │ │  Log +    │  │
│  │ Risk/   │ │ Revoke/  │ │Batch │ │  Verify   │  │
│  │ Health  │ │ Validate │ │      │ │  Chain    │  │
│  └─────────┘ └──────────┘ └──────┘ └───────────┘  │
├─────────────────────────────────────────────────────┤
│                   Core Libraries                     │
│  ┌──────────┐ ┌───────────┐ ┌──────┐ ┌─────────┐  │
│  │ Crypto   │ │ Policy    │ │Audit │ │ Tokens  │  │
│  │ RSA-PSS  │ │ Engine    │ │Hash  │ │ SHA-256 │  │
│  │ SHA-256  │ │ Deny-     │ │Chain │ │ TTL     │  │
│  │ Key Gen  │ │ Default   │ │      │ │ Enforce │  │
│  └──────────┘ └───────────┘ └──────┘ └─────────┘  │
├─────────────────────────────────────────────────────┤
│              Prisma ORM + SQLite                     │
│  User → AgentIdentity → AgentPermission             │
│       → AgentToken → AuthorizationDecision          │
│       → AuditEvent (hash-chained)                    │
└─────────────────────────────────────────────────────┘
```

### Security Model

| Principle | Implementation |
|---|---|
| **Deny by Default** | Everything is denied unless explicitly allowed |
| **Least Privilege** | Agents receive only the minimum permissions needed |
| **Immediate Revocation** | Pause, revoke or block any agent instantly |
| **Temporary Tokens** | No permanent tokens. TTL is mandatory (60s–24h) |
| **Production Guarded** | Production actions always require human approval |
| **Audit Integrity** | Hash-chained append-only log detects tampering |
| **Token Hashing** | Raw tokens are never stored — only SHA-256 hashes |

## 📡 API Reference

### Agents

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/agents` | Create a new agent |
| `GET` | `/api/agents` | List agents (with search/filter) |
| `GET` | `/api/agents/{id}` | Get agent details |
| `DELETE` | `/api/agents/{id}` | Delete an agent |
| `POST` | `/api/agents/{id}/revoke` | Revoke agent identity |
| `POST` | `/api/agents/{id}/pause` | Pause agent |
| `POST` | `/api/agents/{id}/resume` | Resume paused agent |
| `POST` | `/api/agents/{id}/rotate-key` | Rotate agent key pair |
| `POST` | `/api/agents/{id}/approve` | Approve pending action |
| `GET` | `/api/agents/{id}/risk` | Get risk score (7-factor) |
| `GET` | `/api/agents/{id}/health` | Health check |

### Permissions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/agents/{id}/permissions` | Grant permission |
| `GET` | `/api/agents/{id}/permissions` | List permissions |
| `DELETE` | `/api/agents/{id}/permissions` | Revoke permission |

### Tokens

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tokens/issue` | Issue temporary token |
| `POST` | `/api/tokens/{id}/revoke` | Revoke token |

### Authorization

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/authz/check` | Check single action |
| `POST` | `/api/authz/batch-check` | Check multiple actions |

### Audit & Data

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/audit` | List audit events |
| `GET` | `/api/audit/verify` | Verify hash chain integrity |
| `GET` | `/api/audit/export` | Export audit as CSV |
| `GET` | `/api/stats` | Dashboard statistics |
| `GET` | `/api/stats/trends` | 24h trends + distribution |
| `GET` | `/api/activity` | 30-day activity heatmap |
| `GET` | `/api/export` | Export all data as JSON |
| `POST` | `/api/import` | Import data from JSON |
| `GET` | `/api/events/stream` | SSE real-time event feed |

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **Database** | Prisma ORM (SQLite dev / PostgreSQL prod) |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Real-time** | Socket.io (WebSocket) + SSE fallback |
| **Validation** | Zod |
| **State** | Zustand + TanStack Query |

## 📁 Project Structure

```
agentdnai/
├── prisma/
│   └── schema.prisma          # Database schema (5 models)
├── src/
│   ├── app/
│   │   ├── api/               # 26+ API route handlers
│   │   │   ├── agents/        # Agent CRUD + lifecycle
│   │   │   ├── tokens/        # Token issue/revoke
│   │   │   ├── authz/         # Authorization checks
│   │   │   ├── audit/         # Audit log + verify + export
│   │   │   ├── stats/         # Statistics + trends
│   │   │   ├── activity/      # Activity heatmap data
│   │   │   ├── events/        # SSE event stream
│   │   │   ├── export/        # Full JSON export
│   │   │   ├── import/        # JSON import
│   │   │   └── seed/          # Demo data seeding
│   │   ├── globals.css        # Theme + animations
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # SPA (14+ views)
│   ├── components/ui/         # shadcn/ui components
│   ├── hooks/                 # Custom React hooks
│   └── lib/
│       ├── api-client.ts      # TypeScript API client
│       ├── audit.ts           # Hash chain audit logger
│       ├── crypto.ts          # RSA-PSS, SHA-256, key gen
│       ├── db.ts              # Prisma client instance
│       ├── permissions.ts     # 47 permissions, 9 categories
│       ├── policy.ts          # Authorization engine
│       ├── schemas.ts         # Zod validation schemas
│       ├── store.ts           # Zustand navigation store
│       └── tokens.ts          # Token lifecycle service
├── mini-services/
│   └── event-service/         # WebSocket event service (port 3003)
├── db/                        # SQLite database files
├── public/                    # Static assets
└── package.json
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">

**AgentDNAI** — Know every agent. Control every action. Audit every decision.

[🌐 Website](https://smouj.github.io/agentdnai) · [📖 Documentation](https://smouj.github.io/agentdnai) · [🐛 Issues](https://github.com/smouj/agentdnai/issues)

</div>
