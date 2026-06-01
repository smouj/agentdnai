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

## 🏗️ Project Architecture

- **Frontend**: Next.js 16 App Router with TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API Routes with Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Real-time**: Socket.io WebSocket service (port 3003) + SSE fallback
- **State**: Zustand (client) + React hooks

### Key Files

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Main SPA with 14+ views |
| `src/app/api/` | 26+ API route handlers |
| `src/lib/policy.ts` | Authorization engine |
| `src/lib/crypto.ts` | RSA-PSS, SHA-256, key generation |
| `src/lib/audit.ts` | Hash-chained audit logger |
| `src/lib/tokens.ts` | Token lifecycle service |
| `src/lib/permissions.ts` | 47 permissions, 9 categories |
| `prisma/schema.prisma` | Database schema |

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

## 🎨 Theme Guidelines

AgentDNAI uses a **monochrome iridescent** theme with **crimson hover accents**:

- **Base colors**: Monochrome (grayscale with subtle iridescent undertone)
- **Accent color**: Crimson (`text-crimson`, `bg-crimson`, `border-crimson`)
- **Corners**: Rectangular (`rounded-none`) — 2000s aesthetic
- **Shadows**: `shadow-card`, `shadow-card-hover`, `shadow-elevated`
- **No**: Blue, purple, green, pink, or cyan accent colors
- **Hover**: Interactive elements use crimson hover states

## 🐛 Bug Reports

When filing a bug report, please include:

1. **Steps to reproduce** the issue
2. **Expected** behavior
3. **Actual** behavior
4. **Environment** (Node.js version, OS, browser)
5. **Screenshots** if applicable

## 💡 Feature Requests

Feature requests are welcome! Please:

1. Check existing issues first
2. Describe the use case clearly
3. Explain why it would benefit AgentDNAI users

## 🔒 Security Vulnerabilities

**Do not** report security vulnerabilities through public GitHub issues. Please email security concerns directly.

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.
