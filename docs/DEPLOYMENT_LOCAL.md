# Local Deployment with Docker Compose

This guide covers deploying AgentDNAI locally using Docker Compose with SQLite for a simple, self-contained setup.

## Prerequisites

- **Docker** 20+ ([install](https://docs.docker.com/get-docker/))
- **Docker Compose** v2+ (included with Docker Desktop)
- At least **2GB RAM** and **5GB disk space**

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/agentdnai/agentdnai.git
cd agentdnai
```

### 2. Configure Environment

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and set strong secrets:

```env
# Required: Change these for any deployment
TOKEN_PEPPER=$(openssl rand -hex 32)
AUTH_PEPPER=$(openssl rand -hex 32)

# Database (SQLite for local deployment)
DATABASE_URL=file:./db/custom.db

# Disable demo seeding in deployment
ALLOW_DEMO_SEED=false
NODE_ENV=production
```

Generate random peppers:

```bash
echo "TOKEN_PEPPER=$(openssl rand -hex 32)" >> .env
echo "AUTH_PEPPER=$(openssl rand -hex 32)" >> .env
```

### 3. Build and Start

```bash
docker compose up -d --build
```

This will:
1. Build the Docker image (multi-stage: install → build → production)
2. Start the web container on port 3000
3. Create a persistent volume for the SQLite database

### 4. Verify

```bash
# Check container status
docker compose ps

# Check health endpoint
curl http://localhost:3000/api/health

# Check version
curl http://localhost:3000/api/version
```

Expected health response:

```json
{
  "status": "healthy",
  "version": "0.2.0-alpha",
  "timestamp": "2026-06-03T12:00:00.000Z"
}
```

### 5. Access the Dashboard

Open `http://localhost:3000` in your browser to access the AgentDNAI dashboard.

## Architecture

```
┌─────────────────────────────────┐
│  Docker Container               │
│  ┌───────────────────────────┐  │
│  │  Next.js (port 3000)      │  │
│  │  - API Routes             │  │
│  │  - Dashboard UI           │  │
│  │  - Prisma ORM             │  │
│  └───────────────────────────┘  │
│           │                      │
│  ┌───────────────────────────┐  │
│  │  SQLite Database          │  │
│  │  /app/db/custom.db        │  │
│  └───────────────────────────┘  │
│           │                      │
│  ┌───────────────────────────┐  │
│  │  Persistent Volume        │  │
│  │  agentdnai-data           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:./db/custom.db` | SQLite database path |
| `TOKEN_PEPPER` | (required) | Pepper for HMAC-SHA256 token hashing |
| `AUTH_PEPPER` | (required) | Pepper for authentication hashing |
| `NODE_ENV` | `production` | Node environment |
| `ALLOW_DEMO_SEED` | `false` | Enable/disable demo data seeding |
| `NEXT_TELEMETRY_DISABLED` | `1` | Disable Next.js telemetry |

### Volumes

| Volume | Container Path | Purpose |
|---|---|---|
| `agentdnai-data` | `/app/db` | Persistent database storage |

### Ports

| Port | Service |
|---|---|
| 3000 | Next.js web application |

### Health Check

The container includes a health check:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Common Operations

### View Logs

```bash
# Follow logs
docker compose logs -f

# View last 100 lines
docker compose logs --tail 100
```

### Restart

```bash
docker compose restart
```

### Stop

```bash
docker compose down
```

### Stop and Remove Data

```bash
docker compose down -v
```

> **Warning**: This deletes the persistent database volume.

### Rebuild After Code Changes

```bash
docker compose up -d --build
```

### Shell into Container

```bash
docker compose exec agentdnai-web sh
```

## Backup and Restore

### Backup

```bash
# Using the backup script (from host)
./backup.sh YOUR_AUTH_TOKEN

# Manual backup
docker compose exec agentdnai-web cp /app/db/custom.db /app/db/backup.db
docker cp agentdnai-web:/app/db/custom.db ./backup-$(date +%Y%m%d).db
```

### Restore

```bash
# Using the restore script
./restore.sh BACKUP_NAME YOUR_AUTH_TOKEN

# Manual restore
docker cp ./backup.db agentdnai-web:/app/db/custom.db
docker compose restart
```

## Updating

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose up -d --build
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs

# Check if port is in use
lsof -i :3000

# Rebuild from scratch
docker compose down
docker compose up -d --build
```

### Database Errors

```bash
# Check if database volume exists
docker volume ls | grep agentdnai

# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d --build
```

### Health Check Failing

```bash
# Test health endpoint manually
curl -f http://localhost:3000/api/health

# Check container health status
docker compose ps
```

### Performance Issues

For better performance with many agents and audit events, consider upgrading to the production Docker Compose configuration with PostgreSQL. See [DEPLOYMENT_PRODUCTION.md](./DEPLOYMENT_PRODUCTION.md).

## Security Notes

- **Always set strong TOKEN_PEPPER and AUTH_PEPPER** — never use the defaults
- **Disable demo seeding** — set `ALLOW_DEMO_SEED=false`
- **Use HTTPS** — put the container behind a reverse proxy (Caddy, Nginx) for production
- **Restrict access** — bind to `127.0.0.1:3000` if only local access is needed
- **Regular backups** — set up automated backups using the backup script
