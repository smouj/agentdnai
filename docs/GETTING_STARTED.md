# Getting Started with AgentDNAI

This guide will walk you through installing, configuring, and using AgentDNAI — the source-available platform for managing AI agent identities, permissions, and audit trails.

## Prerequisites

- **Bun** 1.0+ ([install](https://bun.sh/))
- **Node.js** 18+ (for compatibility)
- **Git** for cloning the repository

Optional for production:
- **Docker** and **Docker Compose** for containerized deployment
- **PostgreSQL** 16+ for production database
- **Redis** 7+ for caching and session storage

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/agentdnai/agentdnai.git
cd agentdnai
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration. The defaults work for local development:

```env
DATABASE_URL="file:./db/custom.db"
TOKEN_PEPPER="dev-token-pepper-replace-before-deploy"
AUTH_PEPPER="dev-auth-pepper-replace-before-deploy"
NODE_ENV=development
ALLOW_DEMO_SEED=true
```

> **Important**: Generate strong peppers for production using `openssl rand -hex 32`.

### 4. Initialize the Database

```bash
bun run db:push
```

This creates the SQLite database and all required tables.

### 5. Start the Development Server

```bash
bun run dev
```

The application is now running at `http://localhost:3000`.

### 6. Seed Demo Data (Optional)

To populate the dashboard with sample agents, permissions, and audit events:

```bash
curl -X POST http://localhost:3000/api/seed
```

Or use the "Quick Setup" or "Seed Demo" button in the dashboard.

## First Steps

### Using the Dashboard

1. **Open** the application in your browser
2. **Explore** the landing page to understand what AgentDNAI does
3. **Click** "Get Started Free" or "Open Dashboard" to enter the dashboard
4. **Use** the sidebar to navigate between views

### Creating Your First Agent

1. Navigate to the **Agents** view in the sidebar
2. Click **"Create Agent"**
3. Fill in:
   - **Name**: A descriptive name (e.g., "my-build-agent")
   - **Runtime**: Select the runtime type (e.g., codex, hermes, openclaw, cli)
   - **Description**: Optional description of what the agent does
4. Click **Create** — the agent will be created with an RSA-PSS 2048-bit key pair

### Granting Permissions

1. Click on your agent to open the **Agent Detail** view
2. Switch to the **Permissions** tab
3. Click **"Grant Permission"**
4. Select a permission scope (e.g., `github.repo.read`)
5. Choose the effect: ALLOW, DENY, or REQUIRES_APPROVAL
6. Optionally set an expiration time
7. Click **Grant**

### Issuing a Token

1. In the **Agent Detail** view, switch to the **Tokens** tab
2. Click **"Issue Token"**
3. Select scopes for the token
4. Set the TTL (time-to-live): minimum 60 seconds, maximum 24 hours
5. Click **Issue**
6. **Copy the token immediately** — it will only be shown once!

### Checking Authorization

1. In the **Agent Detail** view, use the **Authorization Check** section
2. Enter an action (e.g., `github.repo.read`)
3. Optionally enter a resource
4. Click **Check** to see the authorization decision
5. If the result is "Requires Approval", you can approve it for 1 hour

### Using the Playground

The **Playground** view allows you to test multiple actions at once:

1. Select an agent from the dropdown
2. Enter multiple actions (one per line)
3. Click **"Run Batch Check"**
4. Review the color-coded results for each action

### Comparing Agents

The **Compare** view lets you see side-by-side differences:

1. Select two agents from the dropdowns
2. View matching and unique permissions
3. Green = matching, Cyan = unique to Agent A, Amber = unique to Agent B

## API Usage

You can interact with AgentDNAI entirely through the REST API:

### Create an Agent

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "my-agent", "runtime": "codex", "description": "Build automation agent"}'
```

### Check Authorization

```bash
curl -X POST http://localhost:3000/api/authz/check \
  -H "Content-Type: application/json" \
  -d '{"agentId": "YOUR_AGENT_ID", "action": "github.repo.read"}'
```

### Issue a Token

```bash
curl -X POST http://localhost:3000/api/tokens/issue \
  -H "Content-Type: application/json" \
  -d '{"agentId": "YOUR_AGENT_ID", "scopes": ["github.repo.read"], "ttlSeconds": 3600}'
```

### View Audit Events

```bash
curl http://localhost:3000/api/audit?limit=20
```

### Verify Audit Chain

```bash
curl http://localhost:3000/api/audit/verify
```

See the [API Reference](./API_REFERENCE.md) for complete documentation of all endpoints.

## Key Concepts

### Agent Identity

Every AI agent has a unique identity consisting of:
- **Agent URI**: `agent://owner/runtime/name` — globally unique identifier
- **Public Key**: RSA-PSS 2048-bit key for verification
- **Fingerprint**: SHA-256 hash of the public key for quick identification
- **Status**: ACTIVE, PAUSED, REVOKED, BLOCKED, or EXPIRED

### Permissions

Permissions are scoped to specific actions with three possible effects:
- **ALLOW**: Explicitly permits the action
- **DENY**: Explicitly prohibits the action (always wins over ALLOW)
- **REQUIRES_APPROVAL**: Permits the action only after human approval

Wildcards are supported: `github.*` matches all GitHub actions.

### Tokens

Tokens are temporary credentials with:
- Mandatory TTL (60 seconds to 24 hours)
- Scoped permissions
- HMAC-SHA256 hashed storage (raw token shown only once)
- Immediate revocation capability

### Audit Trail

All actions are recorded in an append-only audit log with:
- SHA-256 hash chain for tamper detection
- Sequence numbers for ordering
- Actor tracking (user, agent, or system)
- Decision recording (ALLOW, DENY, REQUIRES_APPROVAL)

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# Find the process
lsof -i :3000
# Kill it
kill -9 <PID>
```

### Database Errors

If you encounter database errors:

```bash
# Reset the database
bun run db:push
# Re-seed demo data
curl -X POST http://localhost:3000/api/seed
```

### Lint Errors

Before committing, always run:

```bash
bun run lint
```

### Build Errors

```bash
# Clean and rebuild
rm -rf .next
bun run build
```

## Next Steps

- Read the [Security Model](./SECURITY_MODEL.md) to understand how authorization works
- Read the [Permission Model](./PERMISSION_MODEL.md) for detailed permission documentation
- Read the [API Reference](./API_REFERENCE.md) for complete endpoint documentation
- Read [Deployment Guide](./DEPLOYMENT_LOCAL.md) for Docker deployment
