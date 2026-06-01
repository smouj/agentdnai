#!/bin/bash
# AgentDNAI Backup Script
# Usage: ./backup.sh [AUTH_TOKEN]
#
# Creates a backup of the SQLite database and exports all data as JSON.
# The AUTH_TOKEN argument is required if authentication is enabled.
#
# Examples:
#   ./backup.sh                          # Backup database only
#   ./backup.sh my-secret-token          # Backup database + JSON export

set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$DATE"
mkdir -p "$BACKUP_DIR"

echo "🔄 AgentDNAI Backup — $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backup SQLite database
if [ -f "db/custom.db" ]; then
  cp db/custom.db "$BACKUP_DIR/custom.db"
  SIZE=$(du -h "$BACKUP_DIR/custom.db" | cut -f1)
  echo "✅ Database backed up: $BACKUP_DIR/custom.db ($SIZE)"
else
  echo "⚠️  No SQLite database found at db/custom.db"
fi

# Export JSON data (requires auth token if authentication is enabled)
AUTH_TOKEN="${1:-}"
if [ -n "$AUTH_TOKEN" ]; then
  HTTP_STATUS=$(curl -s -o "$BACKUP_DIR/agentdnai-export.json" -w "%{http_code}" \
    http://localhost:3000/api/export \
    -H "Authorization: Bearer $AUTH_TOKEN")
  
  if [ "$HTTP_STATUS" -eq 200 ]; then
    EXPORT_SIZE=$(du -h "$BACKUP_DIR/agentdnai-export.json" | cut -f1)
    echo "✅ JSON export complete: $BACKUP_DIR/agentdnai-export.json ($EXPORT_SIZE)"
  else
    echo "⚠️  JSON export failed (HTTP $HTTP_STATUS). Check your auth token."
    rm -f "$BACKUP_DIR/agentdnai-export.json"
  fi
else
  echo "ℹ️  Skipping JSON export (no auth token provided)"
  echo "   Usage: ./backup.sh YOUR_AUTH_TOKEN"
fi

# Backup summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Backup created at: $BACKUP_DIR"
echo "📅 Timestamp: $DATE"
ls -la "$BACKUP_DIR" 2>/dev/null
echo ""
echo "To restore, run: ./restore.sh $DATE"
