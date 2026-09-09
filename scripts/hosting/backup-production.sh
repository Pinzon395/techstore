#!/usr/bin/env bash
set -Eeuo pipefail

BASE_DIR="${PIXON_BASE_DIR:-/opt/pixon}"
SHARED_DIR="${PIXON_SHARED_DIR:-$BASE_DIR/shared}"
APP_DIR="${PIXON_APP_DIR:-$BASE_DIR/current}"
DATA_DIR="${DATA_DIR:-$SHARED_DIR/data}"
BACKUP_DIR="${BACKUP_DIR:-$DATA_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-95}"

mkdir -p "$BACKUP_DIR/files"
cd "$APP_DIR"
export DATA_DIR BACKUP_DIR

# The application backup is AES-256-GCM authenticated and verifies itself
# before this script proceeds. File backups remain local; encrypt before any
# offsite copy.
npm run db:backup:encrypted
stamp="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
archive="$BACKUP_DIR/files/pixon-files-$stamp.tar.gz"
tar -C "$DATA_DIR" --exclude='./backups' --exclude='./tmp' -czf "$archive" .
sha256sum "$archive" > "$archive.sha256"
chmod 600 "$archive" "$archive.sha256"

# Keeps enough history for 7 daily, 4 weekly and 3 monthly restore points
# when this timer runs daily. Never deletes a backup created today.
find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" -delete
echo "Backup complete: $archive"
