# AgentDNAI Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.0-alpha | :white_check_mark: |
| < 0.2.0   | :x:                |

## Reporting Security Vulnerabilities

**Do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in AgentDNAI, please report it responsibly by emailing the maintainers directly. Include the following information:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** of the vulnerability
4. **Suggested fix** (if available)

We aim to acknowledge reports within 48 hours and provide a detailed response within 7 business days.

## Security Model

AgentDNAI implements a zero-trust security model designed for AI agent authorization:

### Core Principles

| Principle | Implementation |
|---|---|
| **Deny by Default** | Everything is denied unless explicitly allowed. No exceptions. |
| **Least Privilege** | Agents receive only the minimum permissions needed for their function. |
| **Immediate Revocation** | Pause, revoke, or block any agent instantly with immediate effect. |
| **Temporary Tokens** | No permanent tokens exist. TTL is mandatory (60s minimum, 24h maximum). |
| **Production Guarded** | Production actions always require human approval regardless of permissions. |
| **Audit Integrity** | SHA-256 hash-chained append-only log detects any tampering. |
| **Token Hashing** | Raw tokens are never stored — only HMAC-SHA256 hashes with pepper. |

### Cryptographic Standards

| Operation | Algorithm | Key Size |
|---|---|---|
| **Key Pairs** | RSA-PSS | 2048-bit |
| **Token Hashing** | HMAC-SHA256 | 256-bit pepper |
| **Audit Chain** | SHA-256 | — |
| **Signature** | RSA-PSS + SHA-256 | 2048-bit |
| **Token Generation** | CSPRNG (32 bytes) | 256-bit |

### Token Security

1. Raw tokens are never stored in the database
2. Only HMAC-SHA256 hashes (with pepper) are persisted
3. Tokens have mandatory TTL (minimum 60s, maximum 24h)
4. Tokens can be revoked at any time
5. Expired tokens are automatically invalid
6. Timing-safe comparison prevents timing attacks
7. Token format: `adni_<64 hex chars>`

### Audit Trail Integrity

1. Events are append-only — no modification or deletion possible
2. Each event includes `previousHash` linking to the prior event
3. `eventHash` is computed as `SHA-256(canonicalJSON(eventData) + previousHash)`
4. Chain verification detects any tampering or missing events
5. The genesis event uses `"GENESIS"` as the previous hash
6. Sequence numbers ensure ordering integrity

### Authorization Engine

The policy engine follows a strict evaluation order:

1. **Agent not found** → DENY
2. **Agent not ACTIVE** → DENY (with specific status reason)
3. **Token scope check** → DENY if action not in token scopes
4. **Explicit DENY rules** → DENY (always wins, cannot be overridden)
5. **Production/destructive actions** → REQUIRES_APPROVAL
6. **Policy-requires-approval actions** → REQUIRES_APPROVAL
7. **Explicit ALLOW rules** → ALLOW
8. **No matching rule** → DENY (deny-by-default)

## Known Security Limitations

| Limitation | Status | Planned Fix |
|---|---|---|
| Private keys not encrypted at rest | :warning: Open | AES-256 encryption planned |
| No user authentication | :warning: Open | NextAuth.js integration planned |
| Rate limiting not enforced | :warning: Open | Rate limiter middleware planned |
| CORS open in development | :warning: Open | Configurable CORS planned |
| SQLite only (dev) | :white_check_mark: By design | PostgreSQL supported via Docker |

## Security Best Practices for Deployment

1. **Use HTTPS** in production — never expose the application over plain HTTP
2. **Set strong TOKEN_PEPPER and AUTH_PEPPER** — generate with `openssl rand -hex 32`
3. **Set a strong NEXTAUTH_SECRET** — generate with `openssl rand -base64 32`
4. **Use PostgreSQL** instead of SQLite for production workloads
5. **Restrict CORS** to known origins only
6. **Enable rate limiting** when available
7. **Monitor the audit log** for suspicious activity
8. **Regularly rotate agent keys** using the key rotation API
9. **Review high-risk permissions** periodically
10. **Keep dependencies updated** — use Dependabot or similar tools
11. **Back up your database** regularly using the backup script
12. **Verify audit chain integrity** periodically using `/api/audit/verify`
