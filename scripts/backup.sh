#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/mongodb}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
MONGO_HOST="${MONGO_HOST:-127.0.0.1}"
MONGO_PORT="${MONGO_PORT:-27017}"
DB_NAME="${DB_NAME:-topgoldpicks}"

ts() { date -u +'%Y-%m-%dT%H:%M:%SZ'; }
log() { echo "[$(ts)] $*"; }

mkdir -p "$BACKUP_DIR"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
ARCHIVE="$BACKUP_DIR/$DB_NAME-$STAMP.gz"

log "starting backup → $ARCHIVE"

mongodump \
  --host "$MONGO_HOST" \
  --port "$MONGO_PORT" \
  --db "$DB_NAME" \
  --gzip \
  --archive="$ARCHIVE" \
  --quiet

SIZE=$(du -h "$ARCHIVE" | cut -f1)
log "backup complete: $ARCHIVE ($SIZE)"

DELETED=$(find "$BACKUP_DIR" -maxdepth 1 -name "$DB_NAME-*.gz" -type f -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  log "pruned $DELETED backups older than ${RETENTION_DAYS}d"
fi

COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "$DB_NAME-*.gz" -type f | wc -l)
TOTAL=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
log "retained=$COUNT total=$TOTAL"
