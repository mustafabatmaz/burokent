#!/usr/bin/env bash
# Proves the latest backup can be restored, without touching the live stack. Downloads the newest snapshot from B2
# into a scratch folder, loads the database dump into a throwaway PostgreSQL container and prints what came back.
# The throwaway server has none of the stack's roles, so ownership and grants are skipped here; a real restore keeps
# them (see infra/README.md). A backup that was never restored is only a hope; run this now and then.
set -Eeuo pipefail

ENV_FILE="${BUROKENT_BACKUP_ENV:-$HOME/.config/burokent-backup.env}"
RESTIC_IMAGE="restic/restic:0.19.1"
SCRATCH="$(mktemp -d "$HOME/burokent-restore-check.XXXXXX")"
DB_CONTAINER="burokent-restore-check"

cleanup() {
    docker rm -f "$DB_CONTAINER" > /dev/null 2>&1 || true
    # restic runs as root in its container, so what it restored belongs to root: removed from inside one
    docker run --rm --entrypoint rm -v "$SCRATCH:/scratch" "$RESTIC_IMAGE" -rf /scratch/backup > /dev/null 2>&1 || true
    rm -rf "$SCRATCH"
}
trap cleanup EXIT

echo "== Snapshots in B2"
docker run --rm --env-file "$ENV_FILE" "$RESTIC_IMAGE" snapshots --host burokent-vps

echo "== Restoring the latest snapshot"
docker run --rm --env-file "$ENV_FILE" -v "$SCRATCH:/restore" "$RESTIC_IMAGE" \
    restore latest --host burokent-vps --target /restore

echo "== Loading the database dump into a throwaway PostgreSQL"
docker run -d --name "$DB_CONTAINER" -e POSTGRES_PASSWORD=restore-check postgres:18-alpine > /dev/null
until docker exec "$DB_CONTAINER" pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
docker cp "$SCRATCH/backup/db/burokent.dump" "$DB_CONTAINER:/tmp/burokent.dump"
docker exec "$DB_CONTAINER" createdb -U postgres burokent
docker exec "$DB_CONTAINER" pg_restore -U postgres -d burokent --no-owner --no-privileges --exit-on-error \
    /tmp/burokent.dump

echo "== What came back"
docker exec "$DB_CONTAINER" psql -U postgres -d burokent -At -c "
    select 'migrations', count(*) from databasechangelog
    union all select 'users', count(*) from users
    union all select 'roles', count(*) from roles
    union all select 'permissions', count(*) from permissions
    union all select 'audit events', count(*) from audit_events"
echo "== Restore check passed"
