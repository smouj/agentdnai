# AgentDNAI

Verifiable digital identity, granular permissions, and audit trails for AI agents.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

---

## Features

- **Agent Identity Management** -- Create, register, and manage AI agent identities with cryptographic key pairs and unique URIs
- **Granular Permissions** -- Define fine-grained permission scopes across 9 categories (GitHub, filesystem, server, database, browser, secrets, email, payments, production)
- **Policy Engine** -- Real-time authorization checks with ALLOW, DENY, and REQUIRES_APPROVAL decisions
- **Token System** -- Issue time-limited scoped tokens to agents with automatic expiry and revocation
- **Immutable Audit Trail** -- Hash-chained audit events that provide tamper-evident logs of all agent actions
- **Risk Assessment** -- Automatic risk scoring (low/medium/high/critical) for every permission and authorization decision
- **Permission Templates** -- Pre-built templates (Read Only, Audit, Safe Builder, Staging Operator, Production Guarded) for common agent roles
- **Batch Authorization** -- Check multiple permissions in a single request
- **Real-time Event Streaming** -- Server-sent events for live audit feed and activity monitoring
- **Data Export** -- Export audit logs and agent data for compliance and analysis

## Architecture

```
                    +------------------+
                    |   Next.js UI     |
                    |  (Dashboard)     |
                    +--------+---------+
                             |
                    +--------v---------+
                    |   API Routes     |
                    |  (REST + SSE)    |
                    +--------+---------+
                             |
           +-----------------+-----------------+
           |                 |                 |
    +------v------+  +-------v-------+  +------v------+
    | Policy      |  | Token         |  | Audit       |
    | Engine      |  | Manager       |  | Chain       |
    +------+------+  +-------+-------+  +------+------+
           |                 |                 |
           +-----------------+-----------------+
                             |
                    +--------v---------+
                    |   Prisma ORM     |
                    |   (SQLite)       |
                    +------------------+
```

The system is organized into three core layers:

1. **API Layer** -- REST endpoints for agent management, authorization, tokens, and audit queries, plus SSE for real-time streaming
2. **Business Logic Layer** -- Policy engine for authorization decisions, token manager for scoped credential issuance, and audit chain for hash-linked event recording
3. **Data Layer** -- Prisma ORM backed by SQLite, with models for agents, permissions, tokens, authorization decisions, and audit events

## Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+
- npm, yarn, pnpm, or bun

### Installation

```bash
git clone https://github.com/agentdnai/agentdnai.git
cd agentdnai
bun install
```

### Environment Setup

Copy the example environment file and configure your database:

```bash
cp .env.example .env
```

The default configuration uses a local SQLite file:

```
DATABASE_URL=file:./dev.db
```

### Database Setup

```bash
bun run db:push
```

### Development

```bash
bun run dev
```

The application will be available at `http://localhost:3000`.

### Production Build

```bash
bun run build
bun run start
```

## API Reference

### Agent Identity

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents` | Create a new agent identity |
| GET | `/api/agents` | List all agents (with search, status, runtime filters) |
| GET | `/api/agents/[id]` | Get agent details |
| DELETE | `/api/agents/[id]` | Delete an agent |
| POST | `/api/agents/[id]/rotate-key` | Rotate agent key pair |
| POST | `/api/agents/[id]/pause` | Pause an active agent |
| POST | `/api/agents/[id]/resume` | Resume a paused agent |
| POST | `/api/agents/[id]/revoke` | Revoke an agent identity |
| POST | `/api/agents/[id]/approve` | Approve a pending agent |
| GET | `/api/agents/[id]/health` | Check agent health status |
| GET | `/api/agents/[id]/risk` | Get agent risk assessment |

### Permissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/[id]/permissions` | Grant permissions to an agent |
| GET | `/api/agents/[id]/permissions` | List agent permissions |
| DELETE | `/api/agents/[id]/permissions` | Revoke agent permissions |

### Tokens

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tokens/issue` | Issue a scoped temporary token |
| POST | `/api/tokens/[id]/revoke` | Revoke a token |

### Authorization

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/authz/check` | Check if an agent is authorized for an action |
| POST | `/api/authz/batch-check` | Batch check multiple authorization requests |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit` | Query audit events (with filters) |
| GET | `/api/audit/verify` | Verify audit chain integrity |
| GET | `/api/audit/export` | Export audit log data |

### Monitoring and Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get dashboard statistics |
| GET | `/api/stats/trends` | Get activity trend data |
| GET | `/api/activity` | Get recent activity |
| GET | `/api/events/stream` | SSE stream of real-time events |
| GET | `/api/export` | Export all agent data |
| POST | `/api/import` | Import agent data |
| POST | `/api/data/import` | Import data from external source |
| POST | `/api/seed` | Seed the database with sample data |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui (Radix primitives) |
| Database | SQLite via Prisma ORM |
| State Management | Zustand |
| Data Fetching | TanStack React Query |
| Charts | Recharts |
| Forms | React Hook Form + Zod |

## Project Structure

```
agentdnai/
  src/
    app/
      api/              # REST API routes
        agents/         # Agent identity endpoints
        authz/          # Authorization check endpoints
        tokens/         # Token issuance and revocation
        audit/          # Audit query and verification
        stats/          # Dashboard statistics
        events/         # Real-time SSE streaming
        activity/       # Activity feed
        export/         # Data export
        import/         # Data import
        seed/           # Database seeding
      page.tsx          # Landing page
      layout.tsx        # Root layout
      globals.css       # Global styles
    components/
      ui/               # shadcn/ui component library
    lib/
      audit.ts          # Audit chain logic
      crypto.ts         # Key pair generation
      db.ts             # Prisma client
      permissions.ts    # Permission catalog and templates
      policy.ts         # Authorization policy engine
      schemas.ts        # Zod validation schemas
      tokens.ts         # Token issuance and validation
      api-client.ts     # Client-side API wrapper
      store.ts          # Zustand state store
      utils.ts          # Shared utilities
    hooks/              # Custom React hooks
  prisma/
    schema.prisma       # Database schema
  public/               # Static assets
  mini-services/        # Background microservices
  examples/             # Example integrations
```

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes and write clear commit messages
4. Ensure the build passes (`bun run build`)
5. Open a pull request with a description of your changes

All contributions are subject to review. Security-related changes should be disclosed responsibly.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
