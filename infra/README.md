# infra

## Local development

1. Create the environment file and fill in every placeholder:

   ```bash
   cp infra/.env.example infra/.env
   ```

2. Start the infrastructure (PostgreSQL on `127.0.0.1:5433`):

   ```bash
   docker compose -f infra/compose.dev.yaml up -d
   ```

3. Run the backend with the `dev` profile and the variables from `infra/.env`:

   ```bash
   cd backend
   set -a && . ../infra/.env && set +a
   ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
   ```

   In IntelliJ IDEA, set the active profile to `dev` and load `infra/.env` in the run configuration
   (Environment variables → load from file).

   The backend listens on `http://localhost:8090` (Swagger UI: `/swagger-ui/index.html`).

On the first start the backend creates the super admin from `BOOTSTRAP_ADMIN_USERNAME` and
`BOOTSTRAP_ADMIN_PASSWORD_HASH` (see `.env.example` for how to generate the hash). It refuses to start while they are
missing.

The init script in `postgres/init/` only runs when the data volume is empty. After changing it, recreate the volume:

```bash
docker compose -f infra/compose.dev.yaml down -v
```

## Production

`compose.prod.yaml` runs PostgreSQL, the backend, the public site and the admin panel in containers, with memory
limits and no published ports. A shared Caddy in front of them (its own compose project, which also serves other
sites on the same server) reaches them over the external `edge` network by the aliases `burokent-public-web`,
`burokent-admin-web` and `burokent-backend`; PostgreSQL is only on the internal network.

The edge Caddy's main Caddyfile is expected to:

- define a `(common)` snippet (HSTS, no `Server` header),
- trust Cloudflare's addresses for the client IP (`servers { trusted_proxies static <Cloudflare ranges> }`), and
- read `caddy/burokent.caddy` with `import sites/*.caddy` (mount this folder's file into `sites/`).

The client address then travels as `X-Forwarded-For`: Caddy → the admin panel's nginx (trusts Docker's private
networks) → the backend (Tomcat trusts private networks), so the login rate limit and the activity log see the
visitor, not a proxy.

### First setup on the server

```bash
docker network create edge                 # once, shared with the edge Caddy
cp infra/.env.example infra/.env           # fill in every value, including SITE_URL and the bootstrap admin
infra/deploy.sh
```

### Updating and rolling back

```bash
infra/deploy.sh             # pull, build the images one at a time, restart, wait until healthy
infra/deploy.sh rollback    # back to the images from before the last deploy, without building
```

Database changes run when the backend starts (Liquibase). A rollback keeps the newer schema, so changesets are
written to stay compatible with the previous version of the code (add a column first, stop using the old one later).

### Trying the production stack locally

Use another project name so the development database is not touched, and a local Caddy on the `edge` network:

```bash
docker network create edge
docker compose -p burokent-prodcheck -f infra/compose.prod.yaml up -d --build --wait
```
