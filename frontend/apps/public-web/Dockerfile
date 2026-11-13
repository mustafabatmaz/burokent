# Build context is frontend/ (the site needs the workspace packages):
#   docker build -f apps/public-web/Dockerfile --build-arg SITE_URL=https://example.com .

# ---- Stage 1: build the standalone server ----
FROM node:24-alpine AS build
WORKDIR /workspace
# pnpm in the version package.json's packageManager names
RUN corepack enable
ENV NODE_OPTIONS="--max-old-space-size=1536" \
    NEXT_TELEMETRY_DISABLED=1

# Only the lockfile first: the dependency download is reused as long as it doesn't change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

# The pages are rendered at build time, so their canonical and hreflang addresses are fixed here
ARG SITE_URL=https://burokent.com
ENV SITE_URL=$SITE_URL

COPY . .
RUN pnpm install --offline --frozen-lockfile \
    && pnpm --filter @burokent/public-web build

# ---- Stage 2: run server.js as the image's non-root node user ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# The standalone output mirrors the workspace: server.js lives in apps/public-web. Static files and public/
# are not part of it; server.js serves them once they sit next to it.
COPY --from=build /workspace/apps/public-web/.next/standalone ./
COPY --from=build /workspace/apps/public-web/.next/static ./apps/public-web/.next/static
COPY --from=build /workspace/apps/public-web/public ./apps/public-web/public
RUN chown -R node:node apps/public-web/.next

USER node
WORKDIR /app/apps/public-web
EXPOSE 3000
CMD ["node", "server.js"]
