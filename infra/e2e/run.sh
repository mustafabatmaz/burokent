#!/usr/bin/env bash
# End-to-end tests against the production stack, everything in Docker (locally and in CI):
#   infra/e2e/run.sh                      run the tests
#   infra/e2e/run.sh --update-snapshots   also rewrite the screenshot baselines
# Builds the images, starts the stack under its own project name with fresh random secrets, runs Playwright in its
# official image on the same network, and always removes the stack and its data afterwards. Not for the server: it
# would replace the production images.
set -euo pipefail

cd "$(dirname "$0")/.."
project=burokent-e2e
playwright_image=mcr.microsoft.com/playwright:v1.65.0-noble
env_file=$(mktemp)
compose=(docker compose -p "$project" -f compose.prod.yaml -f compose.e2e.yaml --env-file "$env_file")

cleanup() {
  "${compose[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  rm -f "$env_file"
}
trap cleanup EXIT

secret() { openssl rand -hex 24; }

admin_username=e2e-admin
admin_password=$(secret)
admin_hash=$(docker run --rm httpd:2.4-alpine htpasswd -nbBC 10 x "$admin_password" | cut -d: -f2)

cat >"$env_file" <<EOF
POSTGRES_DB=burokent
POSTGRES_PASSWORD=$(secret)
DB_OWNER_USER=burokent_owner
DB_OWNER_PASSWORD=$(secret)
DB_APP_USER=burokent_app
DB_APP_PASSWORD=$(secret)
JWT_SECRET=$(openssl rand -base64 32)
BOOTSTRAP_ADMIN_USERNAME=$admin_username
BOOTSTRAP_ADMIN_PASSWORD_HASH='{bcrypt}$admin_hash'
SITE_URL=https://burokent.test
EOF

docker network inspect edge >/dev/null 2>&1 || docker network create edge >/dev/null
"${compose[@]}" up -d --build --wait

# The edge network is shared with other projects (the blog): no service of this stack may answer there to a
# generic name such as "backend", or another project's lookup of its own "backend" can reach ours
for name in backend public-web admin-web postgres; do
  if docker run --rm --network edge alpine:3.20 getent hosts "$name" >/dev/null; then
    echo "A service of this stack answers to \"$name\" on the shared edge network" >&2
    exit 1
  fi
done

# node_modules lives in an anonymous volume, so the host's own install is left alone. linux/amd64 everywhere, so
# screenshots taken on a laptop match the ones CI takes.
docker run --rm --network edge --ipc=host --platform linux/amd64 \
  -e CI="${CI:-}" \
  -e E2E_ADMIN_USERNAME="$admin_username" \
  -e E2E_ADMIN_PASSWORD="$admin_password" \
  -v "$PWD/../frontend/e2e:/e2e" \
  -v /e2e/node_modules \
  -w /e2e \
  "$playwright_image" \
  bash -c 'npm install --no-package-lock --no-audit --no-fund --loglevel=error && npx playwright test "$@"' \
  playwright "$@"
