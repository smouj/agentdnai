# AgentDNAI Security Policy

## Reporting Security Vulnerabilities

**Do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in AgentDNAI, please report it responsibly.

## Security Model

AgentDNAI implements a zero-trust security model:

### Core Principles

| Principle | Implementation |
|---|---|
| **Deny by Default** | Everything is denied unless explicitly allowed. No exceptions. |
| **Least Privilege** | Agents receive only the minimum permissions needed. |
| **Immediate Revocation** | Pause, revoke or block any agent instantly. |
| **Temporary Tokens** | No permanent tokens exist. TTL is mandatory (60s–24h). |
| **Production Guarded** | Production actions always require human approval. |
| **Audit Integrity** | Hash-chained append-only log detects tampering. |
| **Token Hashing** | Raw tokens are never stored — only SHA-256 hashes. |

### Known Limitations

- **Private keys** are generated but not encrypted at rest (AES-256 encryption planned)
- **User authentication** is not yet implemented (NextAuth.js planned)
- **Rate limiting** is not yet implemented
- **CORS** is open in development (should be restricted in production)
- **SQLite** is used in development (PostgreSQL recommended for production)

### Cryptographic Standards

- **Key Pairs**: RSA-PSS 2048-bit
- **Token Hashing**: SHA-256
- **Audit Chain**: SHA-256 hash chain with previousHash linkage
- **Agent URI**: `agent://owner/runtime/name` format

### Token Security

1. Raw tokens are never stored in the database
2. Only SHA-256 hashes are persisted
3. Tokens have mandatory TTL (minimum 60s, maximum 24h)
4. Tokens can be revoked at any time
5. Expired tokens are automatically invalid

### Audit Trail Integrity

1. Events are append-only — no modification or deletion
2. Each event includes `previousHash` linking to the prior event
3. `eventHash` is computed as `SHA-256(eventData + previousHash)`
4. Chain verification detects any tampering or missing events
5. The genesis event uses `"GENESIS"` as the previous hash

## Security Best Practices for Deployment

1. **Use HTTPS** in production
2. **Restrict CORS** to known origins
3. **Set a strong NEXTAUTH_SECRET**
4. **Use PostgreSQL** instead of SQLite
5. **Encrypt private keys** at rest
6. **Implement rate limiting**
7. **Monitor the audit log** for suspicious activity
8. **Regularly rotate agent keys**
9. **Review high-risk permissions** periodically
10. **Keep dependencies updated**
