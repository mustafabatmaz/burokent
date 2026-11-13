# Build context is frontend/ (the app needs the workspace packages). The nginx config comes from the "infra"
# build context: compose passes ../infra; by hand:
#   docker build -f apps/admin-web/Dockerfile --build-context infra=../infra .

# ---- Stage 1: build the single-page app ----
FROM node:24-alpine AS build
WORKDIR /workspace
# pnpm in the version package.json's packageManager names
RUN corepack enable
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Only the lockfile first: the dependency download is reused as long as it doesn't change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY . .
RUN pnpm install --offline --frozen-lockfile \
    && pnpm --filter @burokent/admin-web build

# ---- Stage 2: serve the static files with nginx, as a non-root user ----
FROM nginxinc/nginx-unprivileged:1.30-alpine
COPY --from=infra nginx/admin.conf /etc/nginx/conf.d/default.conf
COPY --from=infra nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /workspace/apps/admin-web/dist /usr/share/nginx/html
EXPOSE 8080
