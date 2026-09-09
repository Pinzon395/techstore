#!/usr/bin/env bash
set -Eeuo pipefail

# Run on the VPS as the pixon deploy user. Argument 1 is a clean checkout at
# the exact commit to release; production/current is never git-pulled in place.
SOURCE_DIR="${1:?Usage: deploy-production.sh /path/to/clean-checkout}"
BASE_DIR="${PIXON_BASE_DIR:-/opt/pixon}"
RELEASES_DIR="$BASE_DIR/releases"
SHARED_DIR="$BASE_DIR/shared"
CURRENT_LINK="$BASE_DIR/current"
LOCK_FILE="$BASE_DIR/deploy.lock"
RELEASE_ID="${RELEASE_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$(git -C "$SOURCE_DIR" rev-parse --short HEAD)}"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
PREVIOUS_TARGET="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

mkdir -p "$RELEASES_DIR" "$SHARED_DIR/data"
exec 9>"$LOCK_FILE"
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }

test -f "$SHARED_DIR/.env" || { echo "Missing $SHARED_DIR/.env" >&2; exit 1; }
test -d "$SOURCE_DIR/.git" || { echo 'Source must be a clean Git checkout.' >&2; exit 1; }
test -z "$(git -C "$SOURCE_DIR" status --porcelain)" || { echo 'Source checkout has uncommitted changes.' >&2; exit 1; }

mkdir "$RELEASE_DIR"
git -C "$SOURCE_DIR" archive --format=tar HEAD | tar -x -C "$RELEASE_DIR"
ln -s "$SHARED_DIR/.env" "$RELEASE_DIR/.env"
ln -s "$SHARED_DIR/data" "$RELEASE_DIR/data"

cd "$RELEASE_DIR"
export NODE_ENV=production
export DATA_DIR="${DATA_DIR:-$SHARED_DIR/data}"
export BACKUP_DIR="${BACKUP_DIR:-$DATA_DIR/backups}"

npm ci
npm run preflight:linux
npm run typecheck
npm run build
npm run check:indexation
npm run check:jsonld
npm run check:links
npm run check:all-pages
npm run check:i18n
npm run check:claims

# A verified backup is mandatory before schema changes. Migrations retain their
# advisory DB lock and fail closed if the backup is stale or invalid.
npm run db:backup:encrypted
npm run db:migrate

ln -s "$RELEASE_DIR" "$BASE_DIR/current.next"
mv -Tf "$BASE_DIR/current.next" "$CURRENT_LINK"
if ! systemctl restart pixon.service; then
  test -n "$PREVIOUS_TARGET" && ln -sfn "$PREVIOUS_TARGET" "$CURRENT_LINK"
  systemctl restart pixon.service || true
  exit 1
fi

for _ in {1..15}; do
  if curl --fail --silent --show-error http://127.0.0.1:3000/api/health >/dev/null; then
    echo "Deploy healthy: $RELEASE_ID"
    exit 0
  fi
  sleep 2
done

echo 'Healthcheck failed; restoring previous application release.' >&2
test -n "$PREVIOUS_TARGET" && ln -sfn "$PREVIOUS_TARGET" "$CURRENT_LINK"
systemctl restart pixon.service || true
exit 1
