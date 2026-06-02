# AgentDNAI Roadmap

This document outlines the planned development path for AgentDNAI from the current alpha release through to version 1.0.0.

## Current Version: v0.2.0-alpha

### What's Working

- Agent identity management with Ed25519 key pairs
- Deny-by-default authorization engine
- 47 permissions across 9 categories with 10 templates
- Temporary token management with HMAC-SHA256 hashing and pepper
- Append-only audit logging with SHA-256 hash chain
- User authentication (custom JWT + bcryptjs — registration, login, logout, sessions)
- Organization and team management with role-based access
- BOLA (Broken Object Level Authorization) protection via ownership middleware
- Basic rate limiting (in-memory, per-endpoint presets)
- 37+ REST API endpoints
- Full dashboard UI with 17+ views
- Real-time event streaming (WebSocket + SSE)
- Agent risk scoring with 7 risk factors
- Human approval workflow
- Batch authorization checking (up to 50 actions)
- Data export/import (JSON, CSV)
- Docker deployment (local + production)
- Search and filter across agents
- Health checks for agent key rotation, token health, permission count, and audit trail
- API key management (model exists, UI present)
- Monochrome iridescent theme with crimson accents

### Known Limitations

- Private keys not encrypted at rest
- Rate limiting partially implemented (in-memory only, not enforced on all endpoints)
- SQLite only (PostgreSQL supported via Docker)
- No real integrations with external AI platforms
- Light theme needs polish
- No mobile-native experience
- API Keys view uses mock data (needs real backend)
- Organizations view uses mock data (needs real org management backend)

---

## v0.3.0 — Authentication & Security (Target: Q3 2026)

### Theme: Secure the Platform

Focus on making the platform production-ready with proper authentication and key security.

#### User Authentication
- [x] Email/password authentication (custom auth with JWT + bcryptjs)
- [x] Session management (database-backed sessions)
- [ ] Multi-factor authentication (TOTP)
- [ ] Password reset and email verification
- [ ] OAuth providers (Google, GitHub)
- [x] API key authentication (model exists, UI present)

#### Key Security
- [ ] AES-256 encryption for private keys at rest
- [ ] Key encryption key (KEK) management
- [ ] Hardware security module (HSM) integration (optional)
- [ ] Key rotation with zero-downtime

#### Rate Limiting
- [x] Token bucket rate limiting middleware (basic implementation in lib/rate-limit.ts)
- [x] Per-endpoint rate limits (presets for general, auth, token, registration, login)
- [ ] Per-agent rate limits
- [ ] Configurable via environment variables
- [ ] Redis-backed rate limiting for distributed deployments

#### CORS & Security Headers
- [ ] Configurable CORS origins
- [ ] Content Security Policy (CSP) headers
- [ ] HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] CSRF protection

---

## v0.4.0-beta — Integrations & Workflows (Target: Q4 2026)

### Theme: Connect to the Real World

Focus on real integrations with AI platforms and advanced workflow capabilities.

#### AI Platform Integrations
- [ ] OpenClaw agent runtime integration
- [ ] Codex agent runtime integration
- [ ] Hermes agent runtime integration
- [ ] Cursor agent runtime integration
- [ ] Aider agent runtime integration
- [ ] Custom runtime SDK

#### Advanced Approval Workflows
- [ ] Multi-step approval chains
- [ ] Approval delegation (delegate to another user)
- [ ] Time-based approval windows
- [ ] Conditional approvals (if X then auto-approve)
- [ ] Approval templates for common scenarios
- [ ] Slack/Teams webhook notifications for approvals

#### Webhook System
- [ ] Outgoing webhooks for security events
- [ ] Webhook retry with exponential backoff
- [ ] Webhook signature verification (HMAC)
- [ ] Webhook event filtering
- [ ] Webhook delivery status tracking

#### Policy Engine v2
- [ ] Custom policy rules (JavaScript DSL)
- [ ] Time-based policies (business hours only)
- [ ] IP-based policies (VPN/corporate network only)
- [ ] Context-aware policies (based on agent history)
- [ ] Policy simulation and testing

---

## v0.5.0 — Observability & Compliance (Target: Q1 2027)

### Theme: See Everything, Comply Everywhere

Focus on comprehensive observability, compliance reporting, and monitoring.

#### Monitoring & Alerting
- [ ] Prometheus metrics endpoint
- [ ] Grafana dashboard templates
- [ ] Real-time alerting for security events
- [ ] Anomaly detection on authorization patterns
- [ ] Agent behavior analytics
- [ ] Custom alert rules

#### Compliance Reporting
- [ ] SOC 2 Type II report templates
- [ ] GDPR compliance reports
- [ ] HIPAA audit trail reports
- [ ] Custom compliance report builder
- [ ] Automated compliance checks
- [ ] Evidence collection and export

#### Advanced Audit
- [ ] Audit event enrichment (geo-IP, device fingerprint)
- [ ] Long-term audit storage (S3, GCS)
- [ ] Audit event search with full-text indexing
- [ ] Audit timeline visualization
- [ ] Compliance dashboard

#### Database Improvements
- [ ] PostgreSQL as primary database
- [ ] Database connection pooling (PgBouncer)
- [ ] Read replicas for audit queries
- [ ] Automated database migrations
- [ ] Point-in-time recovery

---

## v0.6.0 — Multi-Tenancy & Scale (Target: Q2 2027)

### Theme: Scale for the Enterprise

Focus on multi-tenancy, scaling, and enterprise features.

#### Multi-Tenancy
- [ ] Organization-level isolation
- [ ] Per-organization policy customization
- [ ] Cross-organization agent sharing (with consent)
- [ ] Organization-level billing and quotas
- [ ] Admin portal for organization management

#### Scaling
- [ ] Horizontal pod autoscaling (Kubernetes)
- [ ] Redis-based session storage
- [ ] Distributed rate limiting
- [ ] Event sourcing for audit (Kafka/NATS)
- [ ] CDN for static assets

#### SDK & CLI
- [ ] TypeScript SDK (`@agentdnai/sdk`)
- [ ] Python SDK (`agentdnai-python`)
- [ ] Go SDK (`agentdnai-go`)
- [ ] CLI tool (`agentdnai-cli`)
- [ ] Terraform provider

#### Mobile
- [ ] Responsive mobile UI improvements
- [ ] PWA (Progressive Web App)
- [ ] Push notifications
- [ ] Mobile approval workflow

---

## v0.7.0 — Intelligence & Automation (Target: Q3 2027)

### Theme: Smart Security

Focus on AI-powered security features and automation.

#### AI-Powered Risk Assessment
- [ ] ML-based anomaly detection
- [ ] Behavioral analysis for agents
- [ ] Predictive risk scoring
- [ ] Auto-generated security recommendations
- [ ] Pattern recognition in authorization decisions

#### Automation
- [ ] Automated permission review (expire unused permissions)
- [ ] Auto-revoke agents with high risk scores
- [ ] Scheduled key rotation
- [ ] Automated compliance checks
- [ ] Self-healing audit chain

#### Agent Health Monitoring
- [ ] Agent heartbeat protocol
- [ ] Dead agent detection
- [ ] Auto-pause unhealthy agents
- [ ] Health dashboard with real-time status
- [ ] Incident response automation

---

## v0.8.0-rc.1 — Release Candidate (Target: Q4 2027)

### Theme: Production Ready

Focus on stability, performance, and documentation for the 1.0 release.

#### Performance
- [ ] API response time optimization (< 50ms p99)
- [ ] Database query optimization
- [ ] Caching layer for authorization decisions
- [ ] Connection pooling optimization
- [ ] Load testing and benchmarking

#### Documentation
- [ ] Complete API documentation (OpenAPI/Swagger)
- [ ] Integration guides for each runtime
- [ ] Video tutorials
- [ ] Best practices guide
- [ ] Security audit report

#### Testing
- [ ] Comprehensive unit test coverage (> 80%)
- [ ] Integration test suite
- [ ] End-to-end test suite
- [ ] Performance regression tests
- [ ] Security penetration testing

---

## v1.0.0 — Stable Release (Target: Q1 2028)

### Theme: Enterprise Ready

The first stable, production-ready release with full support.

#### What v1.0 Includes
- All features from v0.3.0 through v0.8.0
- Long-term support (LTS) guarantee
- Migration tools from v0.2.0
- Professional support options
- SLA guarantees
- Security audit certification

#### v1.0 Guarantees
- **API Stability**: No breaking changes without major version bump
- **Data Compatibility**: Forward-compatible database migrations
- **Security**: Regular security audits and prompt CVE patches
- **Documentation**: Comprehensive, up-to-date documentation
- **Support**: Community + commercial support options

---

## Contributing to the Roadmap

Have a feature request or want to help? Here's how:

1. **Feature Requests**: Open a GitHub issue with the `feature-request` label
2. **Discussion**: Start a discussion in GitHub Discussions
3. **Contributions**: See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to contribute code
4. **Sponsorship**: Help fund development through GitHub Sponsors

## Versioning Policy

We follow [Semantic Versioning](https://semver.org/):

- **Major (1.0.0)**: Breaking changes
- **Minor (0.3.0)**: New features, backward-compatible
- **Patch (0.2.1)**: Bug fixes, backward-compatible
- **Pre-release (0.2.0-alpha)**: Unstable, may have breaking changes

Pre-release versions (`-alpha`, `-beta`, `-rc`) indicate instability and may include breaking changes between releases.
