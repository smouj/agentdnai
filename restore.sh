#!/bin/bash
# AgentDNAI Restore Script
# Usage: ./restore.sh BACKUP_NAME [AUTH_TOKEN]
#
# Restores the SQLite database and optionally imports JSON data.
# BACKUP_NAME is the timestamp folder name in ./backups/
#
# Examples:
#   ./restore.sh 20260603_143000                        # Restore database only
#   ./restore.sh 20260603_143000 my-secret-token        # Restore database + JSON import

set -euo pipefail

BACKUP_NAME="${1:-}"
AUTH_TOKEN="${2:-}"

if [ -z "$BACKUP_NAME" ]; then
  echo "❌ Usage: ./restore.sh BACKUP_NAME [AUTH_TOKEN]"
  echo ""
  echo "Available backups:"
  ls -1 ./backups/ 2>/dev/null || echo "  (no backups found)"
  exit 1
fi

BACKUP_DIR="./backups/$BACKUP_NAME"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Backup not found: $BACKUP_DIR"
  exit 1
fi

echo "🔄 AgentDNAI Restore — $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📂 Restoring from: $BACKUP_DIR"

# Confirm restore
read -p "⚠️  This will overwrite your current database. Continue? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "❌ Restore cancelled."
  exit 0
fi

# Create a backup of the current database before overwriting
if [ -f "db/custom.db" ]; then
  CURRENT_BACKUP="./backups/pre-restore-$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$CURRENT_BACKUP"
  cp db/custom.db "$CURRENT_BACKUP/custom.db"
  echo "✅ Current database backed up to: $CURRENT_BACKUP"
fi

# Restore SQLite database
if [ -f "$BACKUP_DIR/custom.db" ]; then
  cp "$BACKUP_DIR/custom.db" db/custom.db
  SIZE=$(du -h db/custom.db | cut -f1)
  echo "✅ Database restored: db/custom.db ($SIZE)"
else
  echo "⚠️  No database file found in backup."
fi

# Import JSON data (requires auth token if authentication is enabled)
if [ -n "$AUTH_TOKEN" ] && [ -f "$BACKUP_DIR/agentdnai-export.json" ]; then
  HTTP_STATUS=$(curl -s -o /tmp/agentdnai-import-result.json -w "%{http_code}" \
    http://localhost:3000/api/import \
    -X POST \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d @"$BACKUP_DIR/agentdnai-export.json")
  
  if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ JSON import complete:"
    cat /tmp/agentdnai-import-result.json | python3 -m json.tool 2>/dev/null || cat /tmp/agentdnai-import-result.json
  else
    echo "⚠️  JSON import failed (HTTP $HTTP_STATUS). Check your auth token."
    cat /tmp/agentdnai-import-result.json 2>/dev/null
  fi
  rm -f /tmp/agentdnai-import-result.json
elif [ -f "$BACKUP_DIR/agentdnai-export.json" ]; then
  echo "ℹ️  JSON export file found but no auth token provided."
  echo "   To import JSON data: ./restore.sh $BACKUP_NAME YOUR_AUTH_TOKEN"
else
  echo "ℹ️  No JSON export file in this backup."
fi

# Restore summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Restore complete from: $BACKUP_DIR"
echo "📅 Restore time: $(date)"
echo ""
echo "⚠️  Restart the application to ensure all data is loaded correctly."
