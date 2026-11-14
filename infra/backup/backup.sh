#!/usr/bin/env bash
# Nightly backup: a dump of the database sent with restic to Backblaze B2. restic encrypts on this server before
# anything leaves it, uploads only what changed, and keeps 7 daily, 4 weekly, 12 monthly and 5 yearly snapshots.
# Run by burokent-backup.timer; safe to run by hand any time.
#
# Secrets live only in the env file (see burokent-backup.env.example), never in this repository.
set -Eeuo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${BUROKENT_BACKUP_ENV:-$HOME/.config/burokent-backup.env}"
DUMP_DIR="${BUROKENT_BACKUP_DUMP_DIR:-$HOME/backups/burokent/db}"
RESTIC_IMAGE="restic/restic:0.19.1"
# Snapshots are grouped by host when old ones are forgotten; the restic container's own name changes every run
HOST="burokent-vps"

# shellcheck source=/dev/null
source "$ENV_FILE"
compose=(docker compose -f "$REPO_DIR/infra/compose.prod.yaml")

# healthchecks.io: start, then success or failure. A run that never reports counts as failed there
ping() {
    if [[ -n "${HEALTHCHECK_URL:-}" ]]; then
        curl -fsS -m 10 --retry 3 -o /dev/null "${HEALTHCHECK_URL}$1" || true
    fi
}
trap 'ping /fail' ERR
ping /start

restic() {
    docker run --rm --env-file "$ENV_FILE" \
        -v "$DUMP_DIR:/backup/db:ro" \
        "$RESTIC_IMAGE" "$@"
}

# A consistent snapshot of the database while the panel keeps running. Written next to the previous dump first,
# so a failed dump never replaces the last good one; the latest dump stays here for a quick local restore
mkdir -p "$DUMP_DIR"
# shellcheck disable=SC2016  # $POSTGRES_DB expands inside the postgres container, not here
"${compose[@]}" exec -T postgres sh -c 'pg_dump -U postgres -d "$POSTGRES_DB" --format=custom' \
    > "$DUMP_DIR/burokent.dump.partial"
mv "$DUMP_DIR/burokent.dump.partial" "$DUMP_DIR/burokent.dump"

restic backup --host "$HOST" --tag nightly /backup
restic forget --host "$HOST" --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --keep-yearly 5 --prune

# Sundays: make sure what is stored in B2 can still be read
if [[ "$(date +%u)" == "7" ]]; then
    restic check
fi

ping ""
