# AgentDNAI Architecture

## System Overview

AgentDNAI is a full-stack web application built with Next.js 16 that provides verifiable digital identity, scoped permissions, temporary tokens, and hash-chained audit trails for AI agents.

## Core Components

### 1. Agent Identity Layer (`src/lib/crypto.ts`)

Every agent receives:
- **Unique URI**: `agent://owner/runtime/name` format
- **RSA-PSS Key Pair**: 2048-bit RSA-PSS for signing and verification
- **Lifecycle Status**: ACTIVE → PAUSED → REVOKED → BLOCKED → EXPIRED

```
Agent Identity Creation Flow:
1. Generate RSA-PSS key pair
2. Compute agent URI from owner + runtime + name
3. Store public key + hashed URI in database
4. Return agent identity with key pair
```

### 2. Permission System (`src/lib/permissions.ts`)

- **47 granular permissions** across **9 categories**
- **3 effects**: ALLOW, DENY, REQUIRES_APPROVAL
- **10 templates**: readonly, audit, safe-builder, staging-operator, production-guarded, local-dev, deploy-agent, security-audit, documentation, full-dev-approval

Categories:
| Category | Scopes | Risk Level |
|---|---|---|
| GitHub | repo.read, repo.write, issue.create, pr.merge, pr.review, webhook.manage | Low–High |
| Server | logs.read, command.run, deploy.staging, deploy.production, config.read, config.write | Medium–Critical |
| Filesystem | read, write, delete, execute | Medium |
| Database | read, write, migrate, backup | Medium–High |
| Browser | open, read, click, form.submit, screenshot | Low–Medium |
| Secrets | read, write, rotate | High–Critical |
| Payments | read, create, refund, manage | High |
| Communication | email.send, slack.read, slack.write, notification.send | Medium |
| System | health.check, metrics.read, cache.clear, backup.manage | Low–High |

### 3. Policy Engine (`src/lib/policy.ts`)

The authorization engine follows a strict evaluation order:

```
1. Deny by Default → If no matching rule, DENY
2. Agent Status Check → REVOKED/BLOCKED = always DENY
3. Production Guard → production.* requires REQUIRES_APPROVAL
4. Explicit DENY → If any DENY rule matches, DENY (overrides ALLOW)
5. Explicit ALLOW → If any ALLOW rule matches, ALLOW
6. No Match → DENY (implicit)
```

### 4. Token Service (`src/lib/tokens.ts`)

- **HMAC-SHA256 hashed storage with pepper**: Raw tokens are never stored in the database
- **TTL enforcement**: 60 seconds to 24 hours (configurable)
- **Scope limiting**: Tokens are scoped to specific permissions
- **Auto-expiration**: Expired tokens are automatically invalid
- **Token formats**: `adni_<64 hex chars>` for agent tokens, `sess_<64 hex chars>` for session tokens

```
Token Lifecycle:
1. Generate random token (32 bytes, hex-encoded)
2. Hash token with HMAC-SHA256 + pepper for storage
3. Set TTL (minimum 60s, maximum 24h)
4. Store hash + scopes + expiry in database
5. Return raw token to caller (never stored)
6. Validation: HMAC-SHA256(input + pepper) === stored_hash AND expiry > now
```

### 5. Audit Logger (`src/lib/audit.ts`)

- **Append-only**: Events can only be added, never modified or deleted
- **Hash chain**: Each event includes the hash of the previous event
- **Tamper detection**: `verifyAuditChain()` detects any modification

```
Hash Chain Structure:
Event[0]: previousHash = "GENESIS", eventHash = SHA-256(data + "GENESIS")
Event[1]: previousHash = Event[0].eventHash, eventHash = SHA-256(data + Event[0].eventHash)
Event[N]: previousHash = Event[N-1].eventHash, eventHash = SHA-256(data + Event[N-1].eventHash)

Verification: For each event, recompute eventHash and verify previousHash linkage
```

### 6. Authentication (`src/lib/auth.ts`)

- **Custom database sessions**: Email/password registration and login (not NextAuth.js/JWT)
- **Database-backed sessions**: Sessions stored in Session table
- **Session tokens**: Format `sess_<64 hex chars>`, validated via Authorization header or cookie
- **Password hashing**: Argon2id with versioned hash format and AUTH_PEPPER
- **Legacy migration**: Old `hmacsha256:` password hashes verify only for migration and are rehashed after successful login
- **Token extraction**: From `Authorization: Bearer <token>` header or `session` cookie

### 7. Ownership & BOLA Protection (`src/lib/ownership.ts`)

- **Direct ownership**: Users can only access agents they own (`ownerUserId`)
- **Organization membership**: Users can access agents in their organizations
- **Role hierarchy**: OWNER > ADMIN > SECURITY_MANAGER > DEVELOPER > VIEWER
- **Middleware functions**: `requireAuth()`, `requireAgentAccess()`, `requireOrgAccess()`, `canManageAgent()`
- **Session-derived ownership**: API routes do not trust client-supplied `ownerId`, `ownerEmail`, `createdBy`, or approver fields
- **Agent token AuthZ**: Public authorization checks validate the bearer agent token, load token scopes from the database, and reject expired/revoked tokens

### 8. Rate Limiting (`src/lib/rate-limit.ts`)

- **In-memory token bucket**: Per-IP and per-endpoint rate limiting
- **Preset configurations**: general, auth, token issuance, registration, login
- **Not yet enforced on all endpoints**: Middleware exists but needs integration

### 9. Risk Scoring (`src/app/api/agents/[id]/risk/route.ts`)

7-factor risk assessment producing a 0–100 score:

| Factor | Impact | Condition |
|---|---|---|
| Agent Status | 0–30 | REVOKED/BLOCKED = +30, PAUSED = +15 |
| Permission Count | 0–20 | >20 = +20, >10 = +10 |
| High-Risk Scopes | 0–15 | +5 each for production.*, secrets.*, server.command.* |
| DENY Permissions | 0–15 | +3 each |
| REQUIRES_APPROVAL | 0–10 | +2 each |
| Active Tokens | 0–10 | +2 each |
| Expired Unrevoked | 0–20 | +5 each |

Risk Levels: Low (0–25), Medium (26–50), High (51–75), Critical (76–100)

## Database Schema

```
User
├── id: String (cuid)
├── email: String (unique)
├── name: String?
├── passwordHash: String
├── createdAt: DateTime
├── agents: AgentIdentity[]
├── sessions: Session[]
├── orgMemberships: OrganizationMember[]
└── approvalRequests: ApprovalRequest[]

Session
├── id: String (cuid)
├── tokenHash: String
├── userId: String → User
├── expiresAt: DateTime
├── createdAt: DateTime
└── user: User

Organization
├── id: String (cuid)
├── name: String
├── slug: String (unique)
├── createdAt: DateTime
├── updatedAt: DateTime
├── members: OrganizationMember[]
└── agents: AgentIdentity[]

OrganizationMember
├── id: String (cuid)
├── userId: String → User
├── organizationId: String → Organization
├── role: String (OWNER|ADMIN|SECURITY_MANAGER|DEVELOPER|VIEWER)
├── joinedAt: DateTime
├── user: User
└── organization: Organization

AgentIdentity
├── id: String (cuid)
├── agentUri: String (unique, agent://owner/runtime/name)
├── name: String
├── runtime: String (hermes|codex|openclaw|cli|automation|custom)
├── status: AgentStatus (ACTIVE|PAUSED|REVOKED|BLOCKED|EXPIRED)
├── publicKey: String (RSA-PSS PEM)
├── description: String?
├── ownerUserId: String → User
├── organizationId: String? → Organization
├── permissions: AgentPermission[]
├── tokens: AgentToken[]
└── auditEvents: AuditEvent[]

AgentPermission
├── id: String (cuid)
├── scope: String (e.g., github.repo.read)
├── resource: String? (e.g., github.com/org/*)
├── effect: PermissionEffect (ALLOW|DENY|REQUIRES_APPROVAL)
├── expiresAt: DateTime?
└── agentId: String → AgentIdentity

AgentToken
├── id: String (cuid)
├── tokenHash: String (HMAC-SHA256 with pepper, never raw token)
├── scopes: String (JSON array)
├── expiresAt: DateTime
├── revokedAt: DateTime?
└── agentId: String → AgentIdentity

AuthorizationDecision
├── id: String (cuid)
├── action: String
├── resource: String?
├── decision: String (allow|deny|requires_approval)
├── reason: String
├── agentId: String → AgentIdentity

ApprovalRequest
├── id: String (cuid)
├── agentId: String → AgentIdentity
├── action: String
├── resource: String?
├── requestedByUserId: String → User
├── status: String (PENDING|APPROVED|REJECTED|EXPIRED)
├── reviewedByUserId: String? → User
├── createdAt: DateTime
├── reviewedAt: DateTime?
└── expiresAt: DateTime

ApiKey
├── id: String (cuid)
├── name: String
├── keyHash: String (HMAC-SHA256)
├── keyPrefix: String (first 8 chars for identification)
├── userId: String → User
├── scopes: String (JSON array)
├── expiresAt: DateTime?
├── lastUsedAt: DateTime?
├── createdAt: DateTime
└── revokedAt: DateTime?

WebhookEndpoint
├── id: String (cuid)
├── url: String
├── secret: String
├── events: String (JSON array)
├── active: Boolean
├── organizationId: String → Organization
├── createdAt: DateTime
└── updatedAt: DateTime

AuditEvent
├── id: String (cuid)
├── eventType: String (AGENT_CREATED|PERMISSION_GRANTED|...)
├── actorType: String
├── actorId: String?
├── agentId: String?
├── organizationId: String?
├── resource: String?
├── action: String?
├── decision: String?
├── metadata: String (JSON)
├── previousHash: String (hash of previous event)
├── eventHash: String (SHA-256 of this event's data + previousHash)
└── createdAt: DateTime
```

## API Architecture

All API routes use:
- **Zod validation** on all inputs (`src/lib/schemas.ts`)
- **Prisma ORM** for database operations
- **Consistent error format**: `{ error: string, details?: any }`
- **HTTP status codes**: 200, 201, 400, 404, 409, 500
- **37+ endpoints** across 10 route groups

## Dashboard Views (17+)

| View | Description |
|---|---|
| Landing | Hero, stats counter, features deep-dive, roadmap timeline, enhanced footer |
| Login | Email/password login form |
| Register | User registration form |
| Onboarding | New user setup wizard |
| Dashboard | Stats with trends, authz bar chart, security score, fleet overview, timeline, quick actions |
| Agents | Agent list with search/filter by status, runtime, and search term |
| Agent Detail | DNI card, permissions, tokens, risk profile, health check, authz playground |
| Approvals | Pending approval requests with approve/reject workflow |
| Audit | Audit log with filters, CSV export, chain verification |
| Policies | Permission templates and catalog browser |
| Tokens | Centralized token management with issue/revoke |
| Orgs | Organization details with members and roles |
| API Keys | API key management table |
| Settings | Security policy, system health, data management, theme toggle, org, danger zone |
| Docs | API reference (28 endpoints), quick start, architecture, CLI (22 commands), security model |
| Playground | Interactive batch authorization checking |
| Compare | Side-by-side agent comparison with permission diff |

## Real-time Architecture

```
Browser ←── SSE ────→ Next.js API (/api/events/stream)
Browser ←── Socket.io → Event Service (port 3003) ←── Poll ──→ Next.js API (/api/audit, /api/stats)
```

- **SSE** (Server-Sent Events): Polls Prisma every 5 seconds, streams new events
- **WebSocket**: Socket.io service polls API every 3 seconds for new audit events, 5 seconds for stats
- Both support initial data burst (last 20 events on connect)

## Security Considerations

1. **Private keys** are generated but not encrypted at rest (TODO: AES-256 encryption)
2. **Tokens** are HMAC-SHA256 hashed with pepper — raw tokens are only returned once at creation
3. **Audit log** is tamper-evident via hash chain verification
4. **Policy engine** is deny-by-default with no exceptions
5. **CORS** is open in development (should be restricted in production)
6. **Rate limiting** is partially implemented (lib/rate-limit.ts exists, not enforced on all endpoints)
7. **BOLA protection** is implemented via ownership.ts — users can only access their own agents or org agents

## Production Deployment

For production deployment:

1. Switch `DATABASE_URL` to PostgreSQL
2. Set strong `TOKEN_PEPPER` and `AUTH_PEPPER` values
3. Enable HTTPS
4. Restrict CORS origins
5. Enforce shared rate limiting on all endpoints
6. Encrypt private keys at rest with AES-256
9. Set up monitoring and alerting
10. Configure proper backup strategy for the database
