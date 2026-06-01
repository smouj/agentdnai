# AgentDNAI API Reference

Complete reference for all AgentDNAI REST API endpoints. All endpoints accept and return JSON unless otherwise noted.

## Base URL

```
http://localhost:3000/api
```

For WebSocket event service:
```
ws://localhost:3003/?XTransformPort=3003
```

## Authentication

Most endpoints require an Authorization header with a session token:

```
Authorization: Bearer <session_token>
```

Session tokens are obtained via `/api/auth/login` or `/api/auth/register`.

## Response Format

Successful responses return JSON with optional `data` wrapper:

```json
{
  "data": { ... }
}
```

Error responses:

```json
{
  "error": {
    "message": "Error description"
  }
}
```

---

## Authentication

### POST /api/auth/register

Register a new user account.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| email | string | Yes | User email address |
| password | string | Yes | Password (min 8 characters) |
| name | string | Yes | Display name |

**Response:** `201 Created`

```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-06-03T12:00:00.000Z"
  },
  "session": {
    "token": "sess_...",
    "expiresAt": "2026-06-04T12:00:00.000Z"
  },
  "organization": {
    "id": "clx...",
    "name": "John's Organization",
    "slug": "johns-organization"
  }
}
```

### POST /api/auth/login

Authenticate and obtain a session token.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| email | string | Yes | User email |
| password | string | Yes | Password |

**Response:** `200 OK`

```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-06-03T12:00:00.000Z"
  },
  "session": {
    "token": "sess_...",
    "expiresAt": "2026-06-04T12:00:00.000Z"
  }
}
```

### POST /api/auth/logout

Invalidate the current session.

**Response:** `200 OK`

### GET /api/auth/me

Get the currently authenticated user.

**Response:** `200 OK`

```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-06-03T12:00:00.000Z",
    "organizations": [
      { "id": "clx...", "name": "My Org", "slug": "my-org", "role": "OWNER" }
    ]
  }
}
```

---

## Agents

### POST /api/agents

Create a new AI agent identity.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| name | string | Yes | Agent name (alphanumeric, dashes) |
| runtime | string | Yes | Runtime type: openclaw, codex, hermes, cursor, aider, windsurf, ollama, cli, automation, custom |
| description | string | No | Description of the agent |

**Response:** `201 Created`

```json
{
  "id": "clx...",
  "agentUri": "agent://owner/hermes/my-agent",
  "name": "my-agent",
  "description": "Build automation agent",
  "runtime": "hermes",
  "environment": "development",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
  "fingerprint": "SHA256:AB:CD:EF:...",
  "status": "ACTIVE",
  "ownerUserId": "clx...",
  "createdAt": "2026-06-03T12:00:00.000Z"
}
```

### GET /api/agents

List all agents with optional filters.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| search | string | Filter by name, description, or agentUri (contains match) |
| status | string | Filter by status: ACTIVE, PAUSED, REVOKED, BLOCKED, EXPIRED |
| runtime | string | Filter by runtime type |

**Response:** `200 OK`

```json
[
  {
    "id": "clx...",
    "agentUri": "agent://owner/hermes/my-agent",
    "name": "my-agent",
    "runtime": "hermes",
    "status": "ACTIVE",
    "_count": { "permissions": 5, "tokens": 2 }
  }
]
```

### GET /api/agents/:id

Get detailed agent information including permissions, tokens, and audit events.

**Response:** `200 OK`

```json
{
  "id": "clx...",
  "agentUri": "agent://owner/hermes/my-agent",
  "name": "my-agent",
  "description": "...",
  "runtime": "hermes",
  "environment": "development",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
  "fingerprint": "SHA256:AB:CD:EF:...",
  "status": "ACTIVE",
  "permissions": [...],
  "tokens": [...],
  "auditEvents": [...],
  "createdAt": "2026-06-03T12:00:00.000Z",
  "lastSeenAt": null,
  "revokedAt": null
}
```

### POST /api/agents/:id/pause

Pause an active agent. Paused agents cannot perform actions.

**Response:** `200 OK` — Returns updated agent with status `PAUSED`

### POST /api/agents/:id/resume

Resume a paused agent.

**Response:** `200 OK` — Returns updated agent with status `ACTIVE`

### POST /api/agents/:id/revoke

Revoke an agent permanently. Revoked agents cannot be resumed.

**Response:** `200 OK` — Returns updated agent with status `REVOKED`

### POST /api/agents/:id/rotate-key

Generate a new RSA-PSS key pair for the agent. The old key is replaced.

**Response:** `200 OK`

```json
{
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
  "fingerprint": "SHA256:AB:CD:EF:..."
}
```

### POST /api/agents/:id/approve

Approve a pending action for an agent. Creates a temporary ALLOW permission (1 hour expiry).

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| action | string | Yes | The action to approve |
| resource | string | No | Optional resource constraint |

**Response:** `200 OK` — Returns the created permission

### GET /api/agents/:id/risk

Compute risk score for an agent based on 7 risk factors.

**Response:** `200 OK`

```json
{
  "agentId": "clx...",
  "riskScore": 29,
  "riskLevel": "medium",
  "factors": [
    { "name": "Agent Status", "impact": 0, "description": "Agent is active" },
    { "name": "Permission Count", "impact": 10, "description": "Agent has 12 permissions" },
    { "name": "High-Risk Scopes", "impact": 10, "description": "2 high-risk scope permissions" },
    { "name": "DENY Permissions", "impact": 0, "description": "No DENY permissions" },
    { "name": "REQUIRES_APPROVAL Permissions", "impact": 0, "description": "No approval-required permissions" },
    { "name": "Active Tokens", "impact": 2, "description": "1 active token" },
    { "name": "Expired Unrevoked Tokens", "impact": 7, "description": "1 expired unrevoked token" }
  ]
}
```

Risk levels: `low` (0-25), `medium` (26-50), `high` (51-75), `critical` (76-100)

### GET /api/agents/:id/health

Get agent health status.

**Response:** `200 OK`

---

## Permissions

### POST /api/agents/:id/permissions

Grant a permission to an agent.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| scope | string | Yes | Permission scope (e.g., `github.repo.read`, `github.*`) |
| resource | string | No | Resource constraint (null = all resources) |
| effect | string | No | ALLOW, DENY, or REQUIRES_APPROVAL (default: ALLOW) |
| expiresAt | string | No | ISO 8601 expiration timestamp |

**Response:** `201 Created`

```json
{
  "id": "clx...",
  "agentId": "clx...",
  "scope": "github.repo.read",
  "resource": null,
  "effect": "ALLOW",
  "expiresAt": null,
  "createdByUserId": "clx...",
  "createdAt": "2026-06-03T12:00:00.000Z"
}
```

### GET /api/agents/:id/permissions

List all permissions for an agent.

**Response:** `200 OK` — Array of permission objects

### DELETE /api/agents/:id/permissions

Revoke a specific permission.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| permissionId | string | Yes | ID of the permission to revoke |

**Response:** `200 OK`

---

## Tokens

### POST /api/tokens/issue

Issue a new temporary token for an agent.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| agentId | string | Yes | Agent ID to issue token for |
| scopes | string[] | Yes | Array of permission scopes |
| ttlSeconds | number | Yes | Time-to-live in seconds (60–86400) |

**Response:** `201 Created`

```json
{
  "tokenId": "clx...",
  "token": "adni_a1b2c3d4e5f6...",
  "scopes": ["github.repo.read", "filesystem.read"],
  "expiresAt": "2026-06-03T13:00:00.000Z"
}
```

> **Warning**: The `token` field is only shown once. Store it securely.

### POST /api/tokens/:id/revoke

Revoke a token immediately.

**Response:** `200 OK`

---

## Authorization

### POST /api/authz/check

Check if an agent is authorized to perform an action.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| agentId | string | Yes | Agent ID |
| action | string | Yes | Action to check (e.g., `github.repo.read`) |
| resource | string | No | Optional resource constraint |

**Response:** `200 OK`

```json
{
  "allowed": true,
  "decision": "allow",
  "reason": "Explicit permission found for this action.",
  "requiresApproval": false,
  "matchedRule": "allow-rule:clx...:github.repo.read"
}
```

Possible `decision` values: `allow`, `deny`, `requires_approval`, `agent_inactive`, `token_invalid`, `token_expired`, `insufficient_scope`

### POST /api/authz/batch-check

Check multiple actions at once (max 50).

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| agentId | string | Yes | Agent ID |
| actions | string[] | Yes | Array of actions to check (max 50) |
| resource | string | No | Optional resource constraint |

**Response:** `200 OK`

```json
{
  "results": [
    { "action": "github.repo.read", "allowed": true, "decision": "allow", "reason": "...", "requiresApproval": false },
    { "action": "production.deploy", "allowed": false, "decision": "requires_approval", "reason": "Production actions require human approval.", "requiresApproval": true }
  ]
}
```

---

## Audit

### GET /api/audit

List audit events with optional filters.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| agentId | string | Filter by agent ID |
| decision | string | Filter by decision (allow, deny, requires_approval) |
| eventType | string | Filter by event type |
| limit | number | Max events to return (default: 50) |
| offset | number | Pagination offset |

**Response:** `200 OK` — Array of audit event objects

### GET /api/audit/verify

Verify the integrity of the entire audit hash chain.

**Response:** `200 OK`

```json
{
  "valid": true,
  "eventsChecked": 42,
  "firstInvalidEvent": null,
  "message": "All 42 events verified successfully."
}
```

### GET /api/audit/export

Export audit events as CSV file.

**Response:** `200 OK` with `Content-Type: text/csv` and `Content-Disposition` header for download.

---

## Approvals

### GET /api/approvals

List approval requests.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| status | string | Filter by status: PENDING, APPROVED, REJECTED, EXPIRED |
| agentId | string | Filter by agent ID |

### POST /api/approvals

Create a new approval request.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| agentId | string | Yes | Agent ID |
| action | string | Yes | Action requiring approval |
| resource | string | No | Optional resource constraint |

### POST /api/approvals/:id/approve

Approve an approval request.

### POST /api/approvals/:id/reject

Reject an approval request.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| note | string | No | Rejection reason |

---

## Organizations

### GET /api/orgs

List organizations the current user belongs to.

### POST /api/orgs

Create a new organization.

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| name | string | Yes | Organization name |
| description | string | No | Description |

### GET /api/orgs/:orgId

Get organization details.

### GET /api/orgs/:orgId/members

List organization members.

---

## Statistics

### GET /api/stats

Get dashboard statistics.

**Response:** `200 OK`

```json
{
  "totalAgents": 5,
  "activeAgents": 3,
  "pausedAgents": 1,
  "revokedAgents": 1,
  "totalPermissions": 27,
  "activeTokens": 2,
  "recentAllowCount": 15,
  "recentDenyCount": 3,
  "recentRequiresApprovalCount": 2
}
```

### GET /api/stats/trends

Get authorization trends and permission distribution.

**Response:** `200 OK`

```json
{
  "hourlyTrends": [
    { "hour": "2026-06-03T10:00:00.000Z", "allow": 5, "deny": 1, "requiresApproval": 0 }
  ],
  "permissionDistribution": [
    { "category": "github", "allow": 8, "deny": 2, "requiresApproval": 1 }
  ],
  "topActions": [
    { "action": "github.repo.read", "count": 12 }
  ],
  "period": "24h"
}
```

### GET /api/activity

Get 30-day activity heatmap data.

**Response:** `200 OK`

```json
{
  "days": [
    { "date": "2026-06-03", "total": 5, "allow": 3, "deny": 1, "requiresApproval": 1 }
  ],
  "agentActivity": {
    "agent-id": { "2026-06-03": 3 }
  },
  "period": "30d"
}
```

---

## Data Management

### GET /api/export

Export all platform data as a downloadable JSON file.

**Response:** `200 OK` with `Content-Disposition: attachment` header

```json
{
  "version": "0.2.0-alpha",
  "exportedAt": "2026-06-03T12:00:00.000Z",
  "agents": [...],
  "auditEvents": [...],
  "authorizationDecisions": [...],
  "stats": { ... }
}
```

### POST /api/import

Import data from a JSON file (same format as export).

**Request Body:** JSON export object

**Response:** `200 OK`

```json
{
  "imported": { "agents": 2, "permissions": 5, "tokens": 1 },
  "skipped": { "agents": 1 },
  "errors": []
}
```

---

## System

### GET /api/health

System health check.

**Response:** `200 OK`

```json
{
  "status": "healthy",
  "version": "0.2.0-alpha",
  "timestamp": "2026-06-03T12:00:00.000Z",
  "services": {
    "database": "connected",
    "audit": "operational"
  }
}
```

### GET /api/version

Get application version info.

**Response:** `200 OK`

```json
{
  "version": "0.2.0-alpha",
  "name": "agentdnai",
  "description": "Verifiable digital identity, granular permissions, and audit trails for AI agents"
}
```

### POST /api/seed

Seed demo data (disabled when `ALLOW_DEMO_SEED=false`).

**Response:** `200 OK`

```json
{
  "agents": 5,
  "permissions": 27,
  "tokens": 2,
  "auditEvents": 5
}
```

---

## Server-Sent Events

### GET /api/events/stream

Real-time stream of security events via SSE.

**Headers:**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Event Types:**

| Event | Description |
|---|---|
| `initial` | Last 20 events sent on connection |
| `security-event` | New audit event detected |

**Example:**

```
event: initial
data: [{"id":"clx...","eventType":"AGENT_CREATED",...}]

event: security-event
data: {"id":"clx...","eventType":"PERMISSION_GRANTED","actorType":"user",...}
```

---

## WebSocket Event Service

Connect to the real-time event service on port 3003:

```javascript
import { io } from 'socket.io-client';

const socket = io('/?XTransformPort=3003');

socket.on('initial-events', (events) => {
  console.log('Initial events:', events);
});

socket.on('security-event', (event) => {
  console.log('New security event:', event);
});

socket.on('stats-update', (stats) => {
  console.log('Stats update:', stats);
});

socket.on('connection-count', (count) => {
  console.log('Connected clients:', count);
});
```

---

## Error Codes

| HTTP Status | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing or invalid token) |
| 404 | Not Found |
| 409 | Conflict (e.g., agent URI already exists) |
| 500 | Internal Server Error |
