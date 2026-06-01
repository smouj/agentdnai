# AgentDNAI Security Model

This document provides a comprehensive overview of AgentDNAI's security architecture, cryptographic foundations, and authorization model.

## Overview

AgentDNAI implements a **zero-trust security model** designed specifically for AI agent authorization. The core principle is simple: **deny everything by default, allow only what is explicitly permitted.**

## Security Architecture

### Layer 1: Agent Identity

Every AI agent has a cryptographically verifiable identity:

| Component | Specification |
|---|---|
| **Key Algorithm** | RSA-PSS 2048-bit |
| **Hash Algorithm** | SHA-256 |
| **Signature Padding** | RSA-PKCS1-PSS with salt length = digest |
| **Fingerprint** | `SHA256:<colon-separated-hex>` format |
| **URI Format** | `agent://owner/runtime/name` |

**Key Generation:**

```typescript
generateKeyPairSync('rsa-pss', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
```

**Identity Verification:**
- Agents can sign challenges using their private key
- Signatures are verified using the stored public key
- Fingerprint provides a compact, human-readable identifier

### Layer 2: Token Security

Tokens are temporary credentials with strong security properties:

| Property | Implementation |
|---|---|
| **Storage** | HMAC-SHA256 hash (raw token never stored) |
| **Pepper** | Configurable `TOKEN_PEPPER` environment variable |
| **Comparison** | Timing-safe (prevents timing attacks) |
| **Format** | `adni_<64 hex chars>` (32 bytes CSPRNG) |
| **TTL** | Mandatory (60s minimum, 24h maximum) |
| **Revocation** | Immediate via API |
| **Scopes** | Scoped to specific actions |

**Token Lifecycle:**

```
1. Issue: Generate random token → HMAC-SHA256(token + pepper) → Store hash
2. Validate: HMAC-SHA256(presented_token + pepper) → Timing-safe compare → Check expiry/revocation
3. Revoke: Set revokedAt timestamp → Immediate effect
4. Expire: Automatic after TTL expires → No grace period
```

### Layer 3: Authorization Engine

The policy engine enforces authorization through an 8-step evaluation order:

```
┌─────────────────────────────────────────────────────┐
│ 1. Agent not found?                              → DENY    │
│ 2. Agent not ACTIVE?                             → DENY    │
│ 3. Action not in token scopes?                   → DENY    │
│ 4. Explicit DENY rule matches?                   → DENY    │
│    (DENY always wins — cannot be overridden)                  │
│ 5. Production or destructive action?             → APPROVAL│
│ 6. Action requires approval by definition?       → APPROVAL│
│ 7. Explicit ALLOW rule matches?                  → ALLOW   │
│    (Check if permission has expired)                          │
│ 8. No matching rule?                             → DENY    │
│    (Deny-by-default)                                          │
└─────────────────────────────────────────────────────┘
```

**Key Principles:**

1. **Deny-by-Default**: If no rule explicitly allows an action, it is denied
2. **DENY Always Wins**: If any DENY rule matches (exact or wildcard), the action is denied regardless of any ALLOW rules
3. **Production Guarded**: All actions starting with `production.*` or `server.deploy.production` require human approval
4. **Destructive Guarded**: Actions containing `.delete`, `.sudo`, `.restore`, `.rollback`, or `filesystem.execute` require approval
5. **Wildcard Matching**: `github.*` matches all GitHub actions; `*` matches everything
6. **Resource Constraints**: Permissions can be scoped to specific resources or all resources (null = wildcard)

### Layer 4: Audit Trail Integrity

The audit log is an append-only, tamper-evident record:

```
Genesis → Event 1 → Event 2 → Event 3 → ... → Event N
          │          │          │                   │
          hash₁      hash₂      hash₃              hashₙ
          │          │          │                   │
          prev=      prev=      prev=               prev=
          "GENESIS"  hash₁      hash₂              hashₙ₋₁
```

**Hash Chain Properties:**

| Property | Implementation |
|---|---|
| **Hash Algorithm** | SHA-256 |
| **Chain Link** | Each event stores `previousHash` = hash of previous event |
| **Genesis** | First event uses `"GENESIS"` as previousHash |
| **Canonical Form** | JSON serialization with consistent field ordering |
| **Verification** | Recompute all hashes and compare against stored values |
| **Tamper Detection** | Any modification breaks all subsequent hashes |

**Event Hash Computation:**

```typescript
const payload = JSON.stringify({
  sequence, eventType, actorType, actorId, agentId,
  organizationId, resource, action, decision,
  metadata, previousHash, createdAt: createdAt.toISOString()
});
const eventHash = SHA256(payload);
```

### Layer 5: Human Approval Workflow

High-risk actions require human approval:

**Automatic Approval Requirements:**
- All production actions (`production.*`, `server.deploy.production`)
- All destructive actions (`.delete`, `.sudo`, `.restore`, `.rollback`, `filesystem.execute`)
- Actions explicitly marked `REQUIRES_APPROVAL` in the permission catalog

**Approval Process:**
1. Authorization check returns `REQUIRES_APPROVAL` decision
2. Approval request created in the queue
3. Human reviewer approves or rejects
4. If approved: temporary ALLOW permission created (1 hour expiry by default)
5. Audit event recorded for the approval

## OWASP BOLA Protection

AgentDNAI implements protection against Broken Object-Level Authorization (BOLA/IDOR):

1. **Agent-Scoped Queries**: All database queries are scoped to the specific agent ID
2. **Permission Checks**: Authorization verified before any agent-specific operation
3. **Token Scoping**: Tokens can only access resources within their granted scopes
4. **No Implicit Access**: No agent can access another agent's resources without explicit permission

## Threat Model

| Threat | Mitigation |
|---|---|
| Token theft | Tokens are short-lived (max 24h), can be revoked immediately |
| Token replay | Token hashes only, timing-safe comparison, one-time display |
| Permission escalation | DENY always wins, deny-by-default, no implicit grants |
| Audit tampering | SHA-256 hash chain, append-only, chain verification |
| Key compromise | Key rotation API, immediate revocation |
| Unauthorized production access | Production actions always require human approval |
| Timing attacks | Timing-safe comparison for token validation |
| Brute force tokens | 256-bit entropy, rate limiting (planned) |

## Known Limitations

| Limitation | Risk Level | Mitigation | Status |
|---|---|---|---|
| Private keys not encrypted at rest | Medium | Restrict file system access | AES-256 planned |
| No rate limiting | Medium | Reverse proxy rate limiting | Implementation planned |
| No CORS restrictions (dev) | Low | Use in dev only, configure for prod | Configurable |
| SQLite concurrent writes | Low | Use PostgreSQL for production | PostgreSQL supported |
| No MFA | Medium | Plan for TOTP/WebAuthn | Planned |

## Security Checklist for Production

- [ ] Set strong `TOKEN_PEPPER` (generate with `openssl rand -hex 32`)
- [ ] Set strong `AUTH_PEPPER` (generate with `openssl rand -hex 32`)
- [ ] Set strong `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- [ ] Use HTTPS (via Caddy, Nginx, or cloud load balancer)
- [ ] Use PostgreSQL instead of SQLite
- [ ] Restrict CORS to known origins
- [ ] Disable demo seeding (`ALLOW_DEMO_SEED=false`)
- [ ] Enable rate limiting
- [ ] Regularly verify audit chain integrity
- [ ] Set up monitoring and alerting
- [ ] Regularly backup the database
- [ ] Keep dependencies updated
