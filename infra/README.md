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
- define a `(burokent_tls)` snippet that loads the site's certificate (`tls <cert file> <key file>`; the files stay
  on the server), so no certificate is requested automatically for these sites,
- trust Cloudflare's addresses for the client IP and read `X-Forwarded-For` from the right, so a value the client
  wrote there is ignored (`servers { trusted_proxies static <Cloudflare ranges>` and `trusted_proxies_strict }`), and
- read this folder's `caddy/` with `import sites/burokent/*.caddy`, the folder mounted read-only at
  `sites/burokent/` (a folder rather than the file, so a `git pull` is seen).

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

## Backups and monitoring

Every night `backup/backup.sh` dumps the database (`pg_dump`, custom format) and sends it with
[restic](https://restic.net) to a private Backblaze B2 bucket. restic encrypts on the server, uploads only what
changed and keeps 7 daily, 4 weekly, 12 monthly and 5 yearly snapshots; on Sundays it also checks what is stored.
The latest dump stays on the server too (`~/backups/burokent/db/`). A systemd timer starts it at 03:30 Turkish
time, and [healthchecks.io](https://healthchecks.io) mails when a night passes without a successful run.

Secrets live only in `~/.config/burokent-backup.env` on the server (`chmod 600`; see
`backup/burokent-backup.env.example`). Keep the restic password and the server's `infra/.env` in a password
manager as well: without the password the backups cannot be read.

### Setup on the server

```bash
cp infra/backup/burokent-backup.env.example ~/.config/burokent-backup.env   # fill in, then chmod 600
docker run --rm --env-file ~/.config/burokent-backup.env restic/restic:0.19.1 init
infra/backup/backup.sh                                                       # first backup by hand
sudo cp infra/backup/burokent-backup.service infra/backup/burokent-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now burokent-backup.timer
infra/backup/restore-check.sh                                                # prove it restores
```

Day to day: `systemctl list-timers burokent-backup.timer`, `journalctl -u burokent-backup.service -n 30`, a backup
right now with `sudo systemctl start burokent-backup.service`. Run `restore-check.sh` every few months: it
restores the latest snapshot into a throwaway PostgreSQL and counts what came back, without touching the stack.

### Restoring onto a new server

Start only PostgreSQL first: its init script creates the owner and application users and leaves the database
empty. Restore as the schema owner, so ownership, grants and the append-only protection come back as they were,
then start the rest; the backend finds its migrations already applied.

```bash
docker compose -f infra/compose.prod.yaml up -d --wait postgres
docker run --rm --env-file ~/.config/burokent-backup.env -v /tmp/restore:/restore restic/restic:0.19.1 \
    restore latest --host burokent-vps --target /restore
docker compose -f infra/compose.prod.yaml exec -T postgres sh -c \
    'pg_restore -U postgres -d "$POSTGRES_DB" --no-owner --role="$DB_OWNER_USER" --exit-on-error' \
    < /tmp/restore/backup/db/burokent.dump
docker compose -f infra/compose.prod.yaml up -d --wait
```

### Uptime

An external monitor checks `https://panel.burokent.com` (the panel itself) and `https://panel.burokent.com/api/health`,
which the panel's nginx passes to the backend's health endpoint: `"status":"UP"` without any component details, or
503 when the backend or the database is down. No other actuator endpoint is reachable from outside.
