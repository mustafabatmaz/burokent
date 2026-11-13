#!/usr/bin/env bash
# Updates the production stack on the server; run by hand from the repository:
#   infra/deploy.sh             pull, build the images one by one, restart
#   infra/deploy.sh rollback    go back to the images that ran before the last deploy (no build, seconds)
set -euo pipefail

cd "$(dirname "$0")"
compose=(docker compose -f compose.prod.yaml)
apps=(backend public-web admin-web)

if [[ "${1:-}" == "rollback" ]]; then
  for app in "${apps[@]}"; do
    docker tag "burokent-$app:prev" "burokent-$app:latest"
  done
  "${compose[@]}" up -d --no-build --wait
  echo "Rolled back to the previous images."
  exit 0
fi

git -C .. pull --ff-only

# Keep the running images for a rollback
for app in "${apps[@]}"; do
  if docker image inspect "burokent-$app:latest" >/dev/null 2>&1; then
    docker tag "burokent-$app:latest" "burokent-$app:prev"
  fi
done

# One build at a time: the server's memory is shared with the blog and the running sites
for app in "${apps[@]}"; do
  "${compose[@]}" build "$app"
done

"${compose[@]}" up -d --wait
docker image prune -f
echo "Deployed."
