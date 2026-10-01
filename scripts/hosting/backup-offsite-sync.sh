#!/usr/bin/env bash
set -Eeuo pipefail

# Copies today's already-created local backup artifacts to an S3-compatible
# offsite bucket (Cloudflare R2 or equivalent). No-op unless R2_BACKUP_BUCKET
# is set, so it is safe to install before offsite storage is provisioned.
# Run by pixon-backup-offsite.timer, shortly after pixon-backup.timer.
#
# Required env (in /opt/pixon/shared/.env) to activate:
#   R2_BACKUP_BUCKET       target bucket name
#   R2_BACKUP_ENDPOINT     e.g. https://<account_id>.r2.cloudflarestorage.com
#   R2_BACKUP_ACCESS_KEY_ID
#   R2_BACKUP_SECRET_ACCESS_KEY
#   BACKUP_OFFSITE_KEY     passphrase used to encrypt the file-archive tarball
#                          before it leaves the VPS (the DB backup is already
#                          AES-256-GCM encrypted by db:backup:encrypted and is
#                          uploaded as-is).

BASE_DIR="${PIXON_BASE_DIR:-/opt/pixon}"
SHARED_DIR="${PIXON_SHARED_DIR:-$BASE_DIR/shared}"
DATA_DIR="${DATA_DIR:-$SHARED_DIR/data}"
BACKUP_DIR="${BACKUP_DIR:-$DATA_DIR/backups}"

if [[ -z "${R2_BACKUP_BUCKET:-}" ]]; then
  echo "R2_BACKUP_BUCKET not set - offsite backup sync skipped (local-only mode)."
  exit 0
fi

: "${R2_BACKUP_ENDPOINT:?R2_BACKUP_ENDPOINT is required when R2_BACKUP_BUCKET is set}"
: "${R2_BACKUP_ACCESS_KEY_ID:?R2_BACKUP_ACCESS_KEY_ID is required when R2_BACKUP_BUCKET is set}"
: "${R2_BACKUP_SECRET_ACCESS_KEY:?R2_BACKUP_SECRET_ACCESS_KEY is required when R2_BACKUP_BUCKET is set}"
: "${BACKUP_OFFSITE_KEY:?BACKUP_OFFSITE_KEY is required when R2_BACKUP_BUCKET is set}"

export AWS_ACCESS_KEY_ID="$R2_BACKUP_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_BACKUP_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

latest_db_backup="$(find "$BACKUP_DIR" -maxdepth 1 -name '*.pixonbak' -printf '%T@ %p\n' | sort -rn | head -n1 | cut -d' ' -f2-)"
latest_manifest="$(find "$BACKUP_DIR" -maxdepth 1 -name '*.pixonbak.manifest.json' -printf '%T@ %p\n' | sort -rn | head -n1 | cut -d' ' -f2-)"
latest_files_archive="$(find "$BACKUP_DIR/files" -maxdepth 1 -name '*.tar.gz' -printf '%T@ %p\n' | sort -rn | head -n1 | cut -d' ' -f2-)"

if [[ -z "$latest_db_backup" || -z "$latest_files_archive" ]]; then
  echo "No fresh backup artifacts found in $BACKUP_DIR - run backup-production.sh first." >&2
  exit 1
fi

stamp="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
enc_archive="$(mktemp)"
trap 'rm -f "$enc_archive"' EXIT

openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt \
  -pass env:BACKUP_OFFSITE_KEY \
  -in "$latest_files_archive" -out "$enc_archive"

prefix="pixon-offsite/$stamp"

aws s3 cp --endpoint-url "$R2_BACKUP_ENDPOINT" "$latest_db_backup" "s3://$R2_BACKUP_BUCKET/$prefix/$(basename "$latest_db_backup")"
[[ -n "$latest_manifest" ]] && aws s3 cp --endpoint-url "$R2_BACKUP_ENDPOINT" "$latest_manifest" "s3://$R2_BACKUP_BUCKET/$prefix/$(basename "$latest_manifest")"
aws s3 cp --endpoint-url "$R2_BACKUP_ENDPOINT" "$enc_archive" "s3://$R2_BACKUP_BUCKET/$prefix/$(basename "$latest_files_archive").enc"

echo "Offsite backup sync complete: $prefix"
