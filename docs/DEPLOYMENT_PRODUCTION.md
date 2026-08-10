# Production Deployment Guide

This guide covers deploying AgentDNAI to production using Docker Compose with PostgreSQL, Redis, and Caddy for a robust, scalable setup.

## Prerequisites

- **Docker** 20+ and **Docker Compose** v2+
- **Domain name** with DNS configured
- At least **4GB RAM**, **20GB disk space**, and **2 CPU cores**
- **SMTP server** (optional, for notifications)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Production Docker Compose                          │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Caddy   │  │  AgentDNAI   │  │  PostgreSQL  │  │
│  │  (443)   │→ │  Web (3000)  │→ │  (5432)      │  │
│  │  HTTPS   │  │  Next.js     │  │  Database    │  │
│  └──────────┘  └──────────────┘  └──────────────┘  │
│                       │                              │
│                ┌──────────────┐                      │
│                │  Redis       │                      │
│                │  (6379)      │                      │
│                │  Cache       │                      │
│                └──────────────┘                      │
└─────────────────────────────────────────────────────┘
```

## Step-by-Step Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone repository
git clone https://github.com/agentdnai/agentdnai.git
cd agentdnai
```

### 2. Configure Environment

Create a production environment file:

```bash
cp .env.example .env
```

Edit `.env` with production values:

```env
# ─── Database (PostgreSQL) ───────────────────────────
DATABASE_URL=postgresql://agentdnai:<POSTGRES_PASSWORD>@postgres:5432/agentdnai

# ─── Authentication ──────────────────────────────────
AUTH_PEPPER=$(openssl rand -hex 32)

# ─── Token Security ──────────────────────────────────
TOKEN_PEPPER=$(openssl rand -hex 32)

# ─── Application ─────────────────────────────────────
NODE_ENV=production
ALLOW_DEMO_SEED=false
NEXT_PUBLIC_APP_URL=https://agentdnai.yourdomain.com

# ─── Redis ───────────────────────────────────────────
REDIS_URL=redis://redis:6379
```

Create a `.env.prod` file for Docker Compose secrets:

```bash
cat > .env.prod << 'EOF'
POSTGRES_PASSWORD=$(openssl rand -hex 32)
TOKEN_PEPPER=$(openssl rand -hex 32)
AUTH_PEPPER=$(openssl rand -hex 32)
EOF
```

> **Important**: Store these secrets securely. Never commit them to version control.

### 3. Configure Caddy

Edit `Caddyfile` for your domain:

```
agentdnai.yourdomain.com {
    @transform_port_query {
        query XTransformPort=*
    }

    handle @transform_port_query {
        reverse_proxy agentdnai-web:{query.XTransformPort} {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }

    handle {
        reverse_proxy agentdnai-web:3000 {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }
}
```

Caddy will automatically provision TLS certificates via Let's Encrypt.

### 4. Build and Deploy

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### 5. Initialize the Database

The first start will:
1. Create the PostgreSQL database
2. Run Prisma migrations
3. Start the Next.js application

```bash
# Verify all services are running
docker compose -f docker-compose.prod.yml ps

# Check health
curl https://agentdnai.yourdomain.com/api/health
```

### 6. Create Admin User

```bash
curl -X POST https://agentdnai.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@yourdomain.com", "password": "<strong-admin-password>", "name": "Admin"}'
```

## Service Configuration

### PostgreSQL

| Setting | Value |
|---|---|
| Image | `postgres:16-alpine` |
| Port | 5432 (internal only) |
| Database | `agentdnai` |
| User | `agentdnai` |
| Volume | `postgres-data` |
| Health Check | `pg_isready -U agentdnai` |

### Redis

| Setting | Value |
|---|---|
| Image | `redis:7-alpine` |
| Port | 6379 (internal only) |
| Health Check | `redis-cli ping` |

### Caddy

| Setting | Value |
|---|---|
| Image | `caddy:2-alpine` |
| Ports | 80 (HTTP→HTTPS redirect), 443 (HTTPS) |
| Volumes | Caddyfile, data, config |
| Auto-TLS | Let's Encrypt via Caddy |

### AgentDNAI Web

| Setting | Value |
|---|---|
| Port | 3000 (internal only) |
| Dependencies | postgres, redis |
| Health Check | `curl -f http://localhost:3000/api/health` |
| Volume | `agentdnai-data` for database |

## Scaling Considerations

### Horizontal Scaling

To run multiple web instances:

```yaml
# docker-compose.prod.yml
agentdnai-web:
  deploy:
    replicas: 3
  # Remove fixed port mapping, use internal networking
```

Use a load balancer (Caddy, Nginx, cloud LB) to distribute traffic.

### Database Scaling

- **Read replicas**: Configure PostgreSQL read replicas for high read throughput
- **Connection pooling**: Use PgBouncer for connection pooling
- **Partitioning**: Partition large audit tables by date

### Redis Configuration

- **Persistence**: Enable RDB snapshots and AOF for data durability
- **Memory**: Set `maxmemory` with `allkeys-lru` eviction policy
- **Cluster**: Use Redis Cluster for high availability

## Monitoring

### Health Checks

All services have built-in health checks:

```bash
# Check all service health
docker compose -f docker-compose.prod.yml ps

# Individual service health
curl https://agentdnai.yourdomain.com/api/health
```

### Audit Chain Verification

Set up periodic chain verification:

```bash
# Add to crontab (every 6 hours)
0 */6 * * * curl -s https://agentdnai.yourdomain.com/api/audit/verify >> /var/log/agentdnai-verify.log
```

### Log Management

```bash
# View application logs
docker compose -f docker-compose.prod.yml logs -f agentdnai-web

# View PostgreSQL logs
docker compose -f docker-compose.prod.yml logs -f postgres

# View Caddy logs
docker compose -f docker-compose.prod.yml logs -f caddy
```

## Backup Strategy

### Automated Backups

Create a backup cron script:

```bash
#!/bin/bash
# /etc/cron.daily/agentdnai-backup

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/agentdnai/$DATE"
mkdir -p "$BACKUP_DIR"

# PostgreSQL dump
docker compose -f /opt/agentdnai/docker-compose.prod.yml exec -T postgres \
  pg_dump -U agentdnai agentdnai > "$BACKUP_DIR/database.sql"

# Compress
gzip "$BACKUP_DIR/database.sql"

# JSON export
curl -s -H "Authorization: Bearer $AGENTDNAI_TOKEN" \
  https://agentdnai.yourdomain.com/api/export \
  -o "$BACKUP_DIR/agentdnai-export.json"

# Keep only last 30 days
find /var/backups/agentdnai -type d -mtime +30 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR"
```

### Restore from Backup

```bash
# Stop the web service
docker compose -f docker-compose.prod.yml stop agentdnai-web

# Restore PostgreSQL
gunzip /var/backups/agentdnai/BACKUP_DATE/database.sql.gz
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U agentdnai agentdnai < /var/backups/agentdnai/BACKUP_DATE/database.sql

# Restart the web service
docker compose -f docker-compose.prod.yml start agentdnai-web
```

## Security Hardening

### 1. Network Security

```yaml
# docker-compose.prod.yml additions
networks:
  frontend:
    # Only Caddy and web service
  backend:
    # Web service, PostgreSQL, Redis
    internal: true  # No external access
```

### 2. Firewall Rules

```bash
# Only allow HTTP/HTTPS and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. Database Security

- Use strong passwords (32+ characters)
- Restrict PostgreSQL to internal network only
- Enable SSL for database connections
- Regular security updates

### 4. Application Security

- Set `ALLOW_DEMO_SEED=false`
- Use strong `TOKEN_PEPPER` and `AUTH_PEPPER`
- Configure CORS to specific origins
- Enable rate limiting
- Monitor audit logs for suspicious activity

## Updating

### Rolling Update

```bash
# Pull latest code
git pull origin main

# Rebuild and restart (with zero downtime if using replicas)
docker compose -f docker-compose.prod.yml up -d --build --no-deps agentdnai-web
```

### Full Update (with downtime)

```bash
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

### Database Migrations

```bash
# Run migrations inside the container
docker compose -f docker-compose.prod.yml exec agentdnai-web \
  bunx prisma migrate deploy
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs SERVICE_NAME

# Check health
docker compose -f docker-compose.prod.yml ps

# Restart specific service
docker compose -f docker-compose.prod.yml restart SERVICE_NAME
```

### Database Connection Issues

```bash
# Verify PostgreSQL is running
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check connection from web service
docker compose -f docker-compose.prod.yml exec agentdnai-web \
  sh -c 'echo "SELECT 1" | bunx prisma db execute --stdin'
```

### SSL Certificate Issues

```bash
# Check Caddy certificate status
docker compose -f docker-compose.prod.yml exec caddy caddy validate --config /etc/caddy/Caddyfile

# Force certificate renewal
docker compose -f docker-compose.prod.yml restart caddy
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check PostgreSQL performance
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U agentdnai -c "SELECT * FROM pg_stat_activity;"

# Check Redis memory
docker compose -f docker-compose.prod.yml exec redis redis-cli info memory
```
