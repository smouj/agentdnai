# AgentDNAI Privacy Policy

**Last Updated:** June 2026

## Introduction

AgentDNAI is a source-available platform for managing AI agent identities, permissions, and audit trails. This privacy policy describes what data AgentDNAI collects, how it is used, and how long it is retained.

## Data We Collect

### Account Data

When you register an account, we collect:

- **Email address** — used for account identification and notifications
- **Display name** — your name as it appears in the platform
- **Password hash** — stored using bcrypt, never stored in plaintext

### Agent Data

When you create and manage AI agents, the platform stores:

- **Agent identity** — name, URI (`agent://owner/runtime/name`), runtime type, environment
- **Public keys** — RSA-PSS public keys for agent verification
- **Fingerprints** — SHA-256 fingerprints of public keys
- **Agent status** — ACTIVE, PAUSED, REVOKED, BLOCKED, or EXPIRED

### Permission Data

The platform records all permission grants and denials:

- **Scope** — what action the permission covers (e.g., `github.repo.read`)
- **Effect** — ALLOW, DENY, or REQUIRES_APPROVAL
- **Resource** — optional resource constraint
- **Expiration** — when the permission expires (if set)
- **Created by** — which user granted the permission

### Token Data

When tokens are issued for agents:

- **Token hash** — HMAC-SHA256 hash (raw token is never stored)
- **Scopes** — what actions the token authorizes
- **Expiration time** — when the token expires
- **Revocation status** — whether the token has been revoked
- **Last used** — timestamp of last token validation

### Audit Data

The platform maintains an append-only audit log:

- **Event type** — what happened (e.g., AGENT_CREATED, PERMISSION_GRANTED)
- **Actor** — who performed the action (user, agent, or system)
- **Agent** — which agent was involved
- **Decision** — authorization decision (ALLOW, DENY, REQUIRES_APPROVAL)
- **Timestamp** — when the event occurred
- **Event hash** — SHA-256 hash for integrity verification
- **Previous hash** — link to previous event in the chain

### Organization Data

If you create or join organizations:

- **Organization name and slug**
- **Your role** — OWNER, ADMIN, SECURITY_MANAGER, DEVELOPER, or VIEWER
- **Membership date**

## How We Use Data

Data is used solely to:

1. **Authenticate** users and authorize AI agent actions
2. **Enforce** security policies and permission rules
3. **Audit** all actions for compliance and security monitoring
4. **Provide** the AgentDNAI dashboard and API functionality

We do **not**:

- Sell or share your data with third parties
- Use your data for advertising or marketing
- Train AI models on your data
- Track your browsing behavior outside the platform

## Data Storage

### Local/Self-Hosted Deployments

When you self-host AgentDNAI:

- All data is stored in **your** SQLite or PostgreSQL database
- Data resides entirely on **your** infrastructure
- You have full control over data retention and deletion
- No data is sent to AgentDNAI servers

### Cryptographic Protections

- Passwords are hashed with bcrypt
- Tokens are stored as HMAC-SHA256 hashes (never plaintext)
- Audit events use SHA-256 hash chain for tamper detection
- Agent keys use RSA-PSS 2048-bit encryption
- Timing-safe comparison prevents timing attacks

## Data Retention

| Data Type | Retention Period | Notes |
|---|---|---|
| Account data | Until account deletion | Can be deleted on request |
| Agent identities | Until explicitly revoked | Revoked agents retained for audit |
| Permissions | Until explicitly revoked | Expired permissions retained for history |
| Token hashes | Until expiration + 30 days | Then eligible for cleanup |
| Audit events | Indefinite (append-only) | Cannot be modified or deleted |
| Authorization decisions | Indefinite | Retained for compliance |

## Data Export

You can export all your data at any time:

- **JSON export** — via the `/api/export` endpoint or Settings page
- **CSV audit export** — via the `/api/audit/export` endpoint
- **Database backup** — via the `backup.sh` script

## Data Deletion

To delete your data:

1. Export your data first (see above)
2. Delete individual agents, permissions, and tokens via the dashboard
3. For complete data removal, delete the database file or drop the PostgreSQL database

Note: Audit events are append-only and cannot be individually deleted to maintain chain integrity.

## Third-Party Services

AgentDNAI does not integrate with third-party analytics, tracking, or advertising services by default. If you configure integrations (webhooks, etc.), data may be sent to those endpoints according to your configuration.

## Children's Privacy

AgentDNAI is not intended for use by children under 13. We do not knowingly collect data from children.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Last Updated" date above. For self-hosted deployments, review the policy in your installed version.

## Contact

For privacy-related questions or concerns, please open an issue on the GitHub repository or contact the maintainers directly.
