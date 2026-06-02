# Changelog

All notable changes to AgentDNAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0-alpha.1] - 2026-06-04

### Added

#### Dashboard Enhancements
- Stats cards with trend indicators (+12%, +8%, +24%, -3% with arrow icons)
- Authorization Decisions CSS bar chart (stacked bar + individual bars for allow/deny/approval)
- Security Score widget (circular SVG with computed score from audit chain + active agents % + permission coverage)
- Agent Fleet Overview (mini-card grid showing each agent with name, status dot, runtime icon)
- Enhanced Recent Activity Timeline with colored left borders per event type and event type icons
- Redesigned Quick Actions with larger buttons, descriptions, and hover effects
- System Status bar with Agents Online count

#### Agent Detail Enhancements
- Better DNI Card: gradient crimson accent line at top, truncated public key with copy button, "VALID" watermark for ACTIVE agents
- Health Check Tab (5th tab): Key Rotation, Token Health, Permission Count, Audit Trail checks with ✓/✗ icons
- Permission Catalog Browser in Grant dialog: organized by category (github, filesystem, server, etc.) with clickable scope buttons
- Authorization Playground: textarea for batch-checking multiple actions, color-coded results with summary stats

#### Landing Page Enhancements
- Stats Counter section: animated count-up numbers (47 Permissions, 9 Categories, 10 Templates, 0 Implicit Grants)
- Features Deep-Dive: 6 feature cards (Ed25519 Identity, Audit Trail, Policy Engine, Tokens, Risk Scoring, Wildcard Permissions)
- Roadmap timeline: v0.2 (current), v0.3, v0.4, v0.5 with staggered animation
- Enhanced footer: 4-column grid (Product, Resources, Security, Company) with security badges

#### New Views
- TokensView: centralized token management with table, issue dialog, revoke capability
- OrganizationsView: org details with members list and role badges
- ApiKeysView: API key management table with Create/Revoke actions

#### Settings Enhancements
- Organization section: org name, member count, user role with Owner badge
- API Keys section: mock API keys table with name, prefix, status, dates, Create button
- Danger Zone: red-bordered card with Export All Data and Delete Account buttons

#### Documentation Enhancements
- API Reference: proper HTML table with Method, Path, Description, Body/Params columns (28 endpoints)
- Quick Start Guide: step-by-step numbered guide with curl code examples
- Architecture section: text-based ASCII architecture diagram and component descriptions
- CLI Reference: expanded from 9 to 22 commands with full flag documentation and examples
- Security Model: cryptographic details card (Ed25519, HMAC-SHA256, SHA-256, token format, chain verification)
- Permission Catalog: count badges per category with hover effects

#### Security & Auth
- User authentication implemented (custom JWT + bcryptjs — registration, login, logout, sessions)
- BOLA (Broken Object Level Authorization) protection via ownership middleware
- Basic rate limiting (in-memory, per-endpoint presets in lib/rate-limit.ts)

### Changed
- Theme updated from dark cybersecurity with cyan accents to monochrome iridescent with crimson accents
- Views count increased from 14+ to 17+
- Permission templates count increased from 5 to 10
- Dashboard views now include Login, Register, Onboarding, Tokens, Orgs, API Keys

### Security
- Ed25519 key pair generation for agent identity (replacing RSA-PSS references)
- HMAC-SHA256 with pepper for token hashing
- Token formats: `sess_<hex>` for sessions, `adni_<hex>` for agent tokens
- BOLA protection enforced via ownership.ts middleware

---

## [0.2.0-alpha] - 2026-06-03

### Added

#### Core Platform
- Agent identity management with Ed25519 key pairs
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

#### Dashboard UI (17+ Views)
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
- Ed25519 key pair generation for agent identity
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
