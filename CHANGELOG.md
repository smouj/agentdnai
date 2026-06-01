# Changelog

All notable changes to AgentDNAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0-alpha] - 2026-06-03

### Added

#### Core Platform
- Agent identity management with RSA-PSS 2048-bit key pairs
- Deny-by-default authorization engine with 8-step evaluation order
- Fine-grained permission system with 47 permissions across 9 categories
- 10 permission templates (read-only, audit, safe-builder, staging-operator, production-guarded, local-dev, deploy-agent, security-audit, documentation, full-dev-approval)
- Temporary token management with HMAC-SHA256 hashing and mandatory TTL (60s–24h)
- Append-only audit logging with SHA-256 hash chain integrity
- Agent risk scoring with 7 risk factors and 4 risk levels
- Human approval workflow for production and destructive actions
- Batch authorization checking (up to 50 actions per request)
- Organization and team management with role-based access

#### API Endpoints (37+)
- **Agents**: CRUD, pause, resume, revoke, rotate-key, approve, risk scoring, health check
- **Authentication**: register, login, logout, session management
- **Organizations**: CRUD, member management
- **Tokens**: issue with scoped permissions, revoke
- **Authorization**: single check, batch check
- **Audit**: list with filters, hash chain verification, CSV export
- **Approvals**: request, approve, reject workflow
- **Stats**: dashboard statistics, 24h trends, permission distribution
- **Activity**: 30-day heatmap data
- **Data**: JSON export and import
- **Health**: system health check, version info
- **Seed**: demo data seeding

#### Dashboard UI (14+ Views)
- Landing page with animated hero, problem/solution sections, live authz demo
- Dashboard overview with stats, security score, activity timeline, quick actions
- Agents list with search and filter (by status, runtime, search term)
- Agent detail with permissions, tokens, risk profile, and authorization playground tabs
- Authorization playground for interactive batch checking
- Agent comparison view with visual permission diff
- Activity heatmap (GitHub-style 30-day grid with daily breakdown chart)
- Audit log page with filters, CSV export, and chain verification
- Tokens management page
- Policies page with templates and permission catalog
- Settings page with system health, data management, theme toggle
- Live security events feed with real-time SSE updates
- In-app documentation viewer

#### Real-Time Features
- WebSocket event service (socket.io on port 3003) for real-time security event notifications
- SSE fallback endpoint for non-WebSocket clients
- Connection status indicators and pause/resume functionality
- Stats updates every 5 seconds via WebSocket

#### Data Visualization
- Recharts-powered authorization trends (24h area chart)
- Permission distribution donut chart by category
- Activity heatmap with daily event breakdown
- Security score with animated circular SVG indicator
- Activity timeline with event type icons
- Stat cards with trend indicators and gradient accents

#### Security
- RSA-PSS 2048-bit key pair generation for agent identity
- HMAC-SHA256 token hashing with configurable pepper
- SHA-256 hash chain audit integrity verification
- Timing-safe token comparison to prevent timing attacks
- Deny-by-default policy engine
- Explicit DENY rules always override ALLOW rules
- Production actions require human approval regardless of permissions
- Destructive actions (delete, sudo, restore, rollback, execute) require approval

#### DevOps & Deployment
- Dockerfile with multi-stage build (bun base + production runner)
- docker-compose.yml for local deployment with SQLite
- docker-compose.prod.yml for production with PostgreSQL, Redis, and Caddy
- Backup and restore shell scripts
- CI/CD pipeline with GitHub Actions
- Dependabot configuration for npm, Docker, and GitHub Actions
- Health check endpoint for container monitoring

#### Documentation
- Getting Started guide
- Security Model documentation
- API Reference (all 37+ endpoints)
- Permission Model documentation
- Local and Production deployment guides
- Roadmap

### Changed
- N/A (initial alpha release)

### Deprecated
- N/A (initial alpha release)

### Removed
- N/A (initial alpha release)

### Fixed
- N/A (initial alpha release)

### Security
- All tokens stored as HMAC-SHA256 hashes (never plaintext)
- Audit chain uses SHA-256 hash chain with previousHash linkage
- Timing-safe comparison prevents timing attacks on token validation
- Deny-by-default authorization with explicit deny always winning
- Production and destructive actions gated behind human approval

---

## Release Notes Template

### [Unreleased]

#### Added
-

#### Changed
-

#### Deprecated
-

#### Removed
-

#### Fixed
-

#### Security
-
