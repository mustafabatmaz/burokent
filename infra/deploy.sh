#!/usr/bin/env bash
# Updates the production stack on the server; run by hand from the repository:
#   infra/deploy.sh             pull, build the images one by one, restart
#   infra/deploy.sh rollback    go back to the images that ran before the last deploy (no build, seconds)
set -euo pipefail

cd "$(dirname "$0")"
compose=(docker compose -f compose.prod.yaml)
# Service names and image names are the same
apps=(burokent-backend burokent-public-web burokent-admin-web)

if [[ "${1:-}" == "rollback" ]]; then
  for app in "${apps[@]}"; do
    docker tag "$app:prev" "$app:latest"
  done
  "${compose[@]}" up -d --no-build --wait --remove-orphans
  echo "Rolled back to the previous images."
  exit 0
fi

git -C .. pull --ff-only

# Keep the running images for a rollback
for app in "${apps[@]}"; do
  if docker image inspect "$app:latest" >/dev/null 2>&1; then
    docker tag "$app:latest" "$app:prev"
  fi
done

# One build at a time: the server's memory is shared with the blog and the running sites
for app in "${apps[@]}"; do
  "${compose[@]}" build "$app"
done

# --remove-orphans: containers of services that no longer exist (e.g. after a rename) are stopped and removed
"${compose[@]}" up -d --wait --remove-orphans
docker image prune -f
echo "Deployed."
