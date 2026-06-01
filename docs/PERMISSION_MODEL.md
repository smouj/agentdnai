# AgentDNAI Permission Model

This document provides a comprehensive reference for AgentDNAI's permission system, including all 47 permissions across 9 categories, 10 templates, wildcard support, and the deny-by-default policy engine.

## Overview

AgentDNAI uses a **deny-by-default** permission model: every action is denied unless an explicit ALLOW rule permits it. DENY rules always override ALLOW rules, and certain high-risk actions require human approval regardless of existing permissions.

## Permission Categories

AgentDNAI organizes permissions into 9 categories:

| Category | Description | Permission Count |
|---|---|---|
| **github** | GitHub repository, issue, PR, and workflow operations | 10 |
| **filesystem** | File read, write, delete, rename, and execute | 5 |
| **server** | Server logs, commands, deployments, and services | 6 |
| **database** | Database read, write, migrations, backup, and restore | 5 |
| **browser** | Web browser automation, forms, downloads, and uploads | 6 |
| **secrets** | Secret read, write, and rotation | 3 |
| **email** | Email read, draft, send, and delete | 4 |
| **payments** | Payment read, create, refund, and configuration | 4 |
| **production** | Production read, write, deploy, rollback, and secrets | 5 |

## Full Permission Catalog

### GitHub (10 permissions)

| Scope | Label | Risk Level | Requires Approval |
|---|---|---|---|
| `github.repo.read` | Read Repositories | low | No |
| `github.repo.write` | Write Repositories | medium | No |
| `github.issue.read` | Read Issues | low | No |
| `github.issue.create` | Create Issues | low | No |
| `github.pull_request.read` | Read Pull Requests | low | No |
| `github.pull_request.create` | Create Pull Requests | medium | No |
| `github.pull_request.merge` | Merge Pull Requests | high | Yes |
| `github.secret.read` | Read Secrets | critical | Yes |
| `github.workflow.read` | Read Workflows | low | No |
| `github.workflow.run` | Run Workflows | high | Yes |

### Filesystem (5 permissions)

| Scope | Label | Risk Level | Requires Approval |
|---|---|---|---|
| `filesystem.read` | Read Files | low | No |
| `filesystem.write` | Write Files | medium | No |
| `filesystem.delete` | Delete Files | high | Yes |
| `filesystem.rename` | Rename Files | medium | No |
| `filesystem.execute` | Execute Files | critical | Yes |

### Server (6 permissions)

| Scope | Label | Risk Level | Requires Approval |
|---|---|---|---|
| `server.logs.read` | Read Logs | low | No |
| `server.command.run` | Run Commands | high | Yes |
| `server.command.sudo` | Sudo Commands | critical | Yes |
| `server.service.restart` | Restart Services | high | Yes |
| `server.deploy.staging` | Deploy Staging | medium | No |
| `server.deploy.production` | Deploy Production | critical | Yes |

### Database (5 permissions)

| Scope | Label | Risk Level | Requires Approval |
|---|---|---|---|
| `database.read` | Read Database | low | No |
| `database.write` | Write Database | medium | No |
| `database.migrate` | Run Migrations | high | Yes |
| `database.backup` | Backup Database | medium | No |
| `database.restore` | Restore Database | critical | Yes |

### Browser (6 permissions)

| Scope | Label | Risk Level | Requires Approval |
|---|---|---|---|
| `browser.open` | Open Browser | low | No |
| `browser.read` | Read Pages | low | No |
| `browser.click` | Click Elements | medium | No |
| `browser.form.submit` | Submit Forms | high | Yes |
| `browser.download` | Download Files | medium | No |
| `browser.upload` | Upload Files | high | Yes |

### Secrets (3 permissions)

| Scope | Label | Risk Level | Requires Approval |
|---|---|---|---|
| `secrets.read` | Read Secrets | critical | Yes |
| `secrets.write` | Write Secrets | critical | Yes |
| `secrets.rotate` | Rotate Secrets | critical | Yes |

### Email (4 permissions)

| Scope | Label | Risk Level | Requires Approval |
|---|---|---|---|
| `email.read` | Read Email | medium | No |
| `email.draft` | Draft Email | low | No |
| `email.send` | Send Email | high | Yes |
| `email.delete` | Delete Email | high | Yes |

### Payments (4 permissions)

| Scope | Label | Risk Level | Requires Approval |
|---|---|---|---|
| `payments.read` | Read Payments | medium | No |
| `payments.create` | Create Payments | critical | Yes |
| `payments.refund` | Refund Payments | critical | Yes |
| `payments.configure` | Configure Payments | critical | Yes |

### Production (5 permissions)

| Scope | Label | Risk Level | Requires Approval |
|---|---|---|---|
| `production.read` | Read Production | medium | No |
| `production.write` | Write Production | critical | Yes |
| `production.deploy` | Deploy Production | critical | Yes |
| `production.rollback` | Rollback Production | critical | Yes |
| `production.secret.access` | Access Production Secrets | critical | Yes |

## Permission Effects

Every permission grant has one of three effects:

| Effect | Description | Visual Indicator |
|---|---|---|
| **ALLOW** | Explicitly permits the action | Green |
| **DENY** | Explicitly prohibits the action (always wins) | Red |
| **REQUIRES_APPROVAL** | Permits action only after human approval | Amber |

## Wildcard Support

Permissions support wildcard patterns for flexible scoping:

| Pattern | Matches | Example |
|---|---|---|
| `*` | Everything | Matches all actions |
| `github.*` | All GitHub actions | `github.repo.read`, `github.issue.create`, etc. |
| `github.repo.*` | All GitHub repo actions | `github.repo.read`, `github.repo.write` |
| `production.*` | All production actions | `production.read`, `production.deploy` |
| `server.command.*` | All server commands | `server.command.run`, `server.command.sudo` |

**Evaluation Order:**
1. Exact scope match first (most specific)
2. Wildcard patterns (less specific)

## Permission Templates

### 1. Read Only Agent (`read-only`)

Agent with read-only access across repositories, issues, filesystem, and logs.

**Allowed:** `github.repo.read`, `github.issue.read`, `filesystem.read`, `server.logs.read`

**Denied:** `filesystem.delete`, `server.command.sudo`, `production.*`, `secrets.*`

### 2. Audit Agent (`audit`)

Agent for auditing repositories, pull requests, logs, and databases.

**Allowed:** `github.repo.read`, `github.issue.read`, `github.pull_request.read`, `server.logs.read`, `database.read`

**Denied:** `filesystem.write`, `server.command.run`, `secrets.*`

### 3. Safe Builder Agent (`safe-builder`)

Agent for building features safely with read/write but no destructive operations.

**Allowed:** `github.repo.read`, `github.issue.create`, `github.pull_request.create`, `filesystem.read`, `filesystem.write`

**Denied:** `filesystem.delete`, `server.command.sudo`, `production.*`, `secrets.*`

### 4. Staging Operator Agent (`staging-operator`)

Agent for managing staging deployments.

**Allowed:** `github.repo.read`, `server.logs.read`, `server.deploy.staging`, `server.service.restart`

**Denied:** `server.deploy.production`, `production.*`, `secrets.*`

### 5. Production Guarded Agent (`production-guarded`)

Agent with read access to production. All write actions require human approval.

**Allowed:** `production.read`, `production.deploy`, `production.rollback`

**Denied:** `production.write`, `production.secret.access`

### 6. Local Dev Agent (`local-dev`)

Agent for local development with read/write filesystem, terminal, and GitHub read.

**Allowed:** `github.repo.read`, `github.issue.read`, `github.pull_request.read`, `filesystem.read`, `filesystem.write`, `server.logs.read`, `database.read`

**Denied:** `filesystem.delete`, `filesystem.execute`, `server.command.sudo`, `production.*`, `secrets.*`

### 7. Deploy Agent (`deploy-agent`)

Agent for managing deployments to staging and production.

**Allowed:** `server.deploy.staging`, `server.deploy.production`, `server.service.restart`, `server.logs.read`, `production.read`

**Denied:** `secrets.*`, `production.secret.access`

### 8. Security Audit Agent (`security-audit`)

Agent for security auditing with read access everywhere.

**Allowed:** `github.repo.read`, `server.logs.read`, `database.read`, `production.read`, `browser.read`, `browser.open`

**Denied:** `filesystem.write`, `filesystem.delete`, `server.command.run`, `secrets.write`, `production.write`

### 9. Documentation Agent (`documentation`)

Agent for writing documentation with safe file operations.

**Allowed:** `github.repo.read`, `github.repo.write`, `filesystem.read`, `filesystem.write`, `browser.read`, `browser.open`

**Denied:** `filesystem.delete`, `filesystem.execute`, `server.command.*`, `production.*`, `secrets.*`

### 10. Full Dev Agent with Approvals (`full-dev-approval`)

Agent with broad permissions but production/secrets require approval.

**Allowed:** `github.repo.read`, `github.repo.write`, `github.issue.create`, `github.pull_request.create`, `github.pull_request.merge`, `filesystem.read`, `filesystem.write`, `server.logs.read`, `server.deploy.staging`, `database.read`, `database.write`, `database.migrate`, `browser.open`, `browser.read`

**Denied:** `filesystem.execute`, `server.command.sudo`

## Automatic Approval Requirements

Certain actions require human approval automatically, regardless of permission configuration:

### Production Actions
- Any action starting with `production.*`
- `server.deploy.production`

### Destructive Actions
- Any action containing `.delete`
- Any action containing `.sudo`
- Any action containing `.restore`
- Any action containing `.rollback`
- `filesystem.execute`

### Policy-Defined Approval Actions
All permissions with `requiresApproval: true` in the catalog (see individual categories above).

## Resource Constraints

Permissions can optionally be scoped to specific resources:

| Resource Value | Effect |
|---|---|
| `null` | Matches all resources (wildcard) |
| `repo:my-org/my-repo` | Matches only the specified repository |
| `server:prod-us-east` | Matches only the specified server |

**Evaluation:** If a permission has no resource (null), it matches all resources. If it has a resource, it must match exactly.

## Permission Expiration

Permissions can have an optional expiration time:

```json
{
  "scope": "github.repo.read",
  "effect": "ALLOW",
  "expiresAt": "2026-06-04T12:00:00.000Z"
}
```

Expired permissions are automatically treated as if they don't exist during authorization checks. They are retained in the database for audit purposes.

## Risk Scoring

Agent risk scores are computed based on 7 factors:

| Factor | Impact | Condition |
|---|---|---|
| Agent Status | +30 | REVOKED or BLOCKED |
| Agent Status | +15 | PAUSED |
| Permission Count | +20 | More than 20 permissions |
| Permission Count | +10 | More than 10 permissions |
| High-Risk Scopes | +5 each | `production.*`, `secrets.*`, `server.command.*` |
| DENY Permissions | +3 each | Each DENY permission |
| REQUIRES_APPROVAL | +2 each | Each approval-required permission |
| Active Tokens | +2 each | Each active token |
| Expired Unrevoked | +5 each | Each expired, unrevoked token |

**Risk Levels:**
- **Low** (0–25): Agent is well-configured with minimal risk
- **Medium** (26–50): Some risk factors present, review recommended
- **High** (51–75): Significant risk, immediate review needed
- **Critical** (76–100): Dangerous configuration, immediate action required
