# Contributing to AgentDNAI

Thank you for your interest in contributing to AgentDNAI! This document provides guidelines and instructions for contributing.

## 🚀 Quick Start

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/agentdnai.git
   cd agentdnai
   ```
3. **Install** dependencies:
   ```bash
   bun install
   ```
4. **Set up** the database:
   ```bash
   cp .env.example .env
   bun run db:push
   ```
5. **Start** the development server:
   ```bash
   bun run dev
   ```

## 📋 Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Ensure linting passes: `bun run lint`
4. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a Pull Request against `main`

### Branch Naming Conventions

| Prefix | Purpose | Example |
|---|---|---|
| `feat/` | New feature | `feat/agent-groups` |
| `fix/` | Bug fix | `fix/audit-filter-crash` |
| `docs/` | Documentation | `docs/api-reference` |
| `refactor/` | Code restructuring | `refactor/policy-engine` |
| `chore/` | Maintenance | `chore/update-deps` |

## 🏗️ Project Architecture

- **Frontend**: Next.js 16 App Router with TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API Routes with Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Real-time**: Socket.io WebSocket service (port 3003) + SSE fallback
- **State**: Zustand (client) + React hooks
- **Charts**: Recharts for data visualization
- **Animations**: Framer Motion

### Key Files

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Main SPA with 17+ views |
| `src/app/api/` | 37+ API route handlers |
| `src/lib/policy.ts` | Authorization engine (deny-by-default) |
| `src/lib/crypto.ts` | RSA-PSS, HMAC-SHA256, SHA-256, key generation |
| `src/lib/audit.ts` | Hash-chained audit logger with 18 event types |
| `src/lib/tokens.ts` | Token lifecycle service (issue, revoke, validate) |
| `src/lib/permissions.ts` | 47 permissions across 9 categories, 10 templates |
| `src/lib/auth.ts` | User authentication (registration, login, sessions, password hashing) |
| `src/lib/organizations.ts` | Organization and team management with roles |
| `src/lib/ownership.ts` | BOLA protection — ownership checks and role-based access |
| `src/lib/rate-limit.ts` | In-memory rate limiting with per-endpoint presets |
| `src/lib/api-client.ts` | TypeScript API client wrapper |
| `src/lib/store.ts` | Zustand client-side navigation store |
| `prisma/schema.prisma` | Database schema (10+ models) |
| `mini-services/event-service/` | Real-time WebSocket event service |

### API Routes

The application has 37+ API endpoints organized as:

| Route Group | Endpoints | Description |
|---|---|---|
| `/api/agents` | CRUD + pause/resume/revoke/rotate-key/approve/risk/health | Agent management |
| `/api/auth` | register/login/logout/me | User authentication |
| `/api/orgs` | CRUD + members | Organization management |
| `/api/tokens` | issue + revoke | Token lifecycle |
| `/api/authz` | check + batch-check | Authorization engine |
| `/api/audit` | list + verify + export | Audit trail |
| `/api/approvals` | CRUD + approve/reject | Approval workflow |
| `/api/stats` | dashboard + trends | Analytics |
| `/api/activity` | heatmap data | Activity tracking |
| `/api/export` + `/api/import` | JSON data portability | Data management |

## 📝 Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug
docs: update documentation
style: formatting, missing semi-colons
refactor: code restructuring
test: adding tests
chore: maintenance tasks
```

### Examples

```bash
git commit -m "feat: add agent grouping feature"
git commit -m "fix: resolve audit filter crash on empty values"
git commit -m "docs: add deployment guide for production"
git commit -m "refactor: extract authorization logic into policy engine"
```

## 🎨 Code Style

- **TypeScript** throughout with strict typing
- **ESLint** for code quality — run `bun run lint` before committing
- **Prettier** for formatting (if configured)
- Use existing shadcn/ui components instead of building from scratch
- Follow the existing monochrome iridescent theme with crimson accents
- Use Framer Motion for animations
- Use Recharts for data visualizations

## 🧪 Testing Your Changes

Before submitting a PR:

1. Run the linter: `bun run lint`
2. Build the project: `bun run build`
3. Manually test your changes in the dashboard
4. Verify all existing views still work correctly
5. Test API endpoints with curl if you modified backend code

## 🔀 Pull Request Process

1. **Title**: Use conventional commit format (e.g., `feat: add agent grouping`)
2. **Description**: Include:
   - What changes you made and why
   - Which views/APIs are affected
   - How you tested the changes
   - Any breaking changes
3. **Review**: At least one maintainer review required
4. **CI**: All CI checks must pass (lint, build, prisma validate)
5. **Squash merge**: PRs are typically squash-merged

## 🐛 Bug Reports

When filing a bug report, please include:

1. **Steps to reproduce** the issue
2. **Expected** behavior
3. **Actual** behavior
4. **Environment** (Node.js/Bun version, OS, browser)
5. **Screenshots** if applicable
6. **Dev server logs** (check `dev.log`)

## 💡 Feature Requests

Feature requests are welcome! Please:

1. Check existing issues first to avoid duplicates
2. Describe the use case clearly
3. Explain why it would benefit AgentDNAI users
4. Include any relevant mockups or examples

## 🔒 Security Vulnerabilities

**Do not** report security vulnerabilities through public GitHub issues. Please see [SECURITY.md](./SECURITY.md) for responsible disclosure instructions.

## 📜 License

By contributing, you agree that your contributions may be used, modified, published, and distributed by AgentDNAI under the repository's source-available proprietary license or a future license chosen by the project maintainers.
