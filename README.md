# burokent

Website and back-office system for an office furniture company that makes classic furniture in its own workshop. Two
parts:

- **Public website:** a showcase of the collections in Turkish, English and Arabic (right-to-left), built to bring
  visitors to the showroom and collect quote requests. No prices, no online shop.
- **Admin panel:** the company's daily work: products, stock, production orders, quotes, sales, customer accounts,
  users and permissions, and an activity log nobody can change.

> **Status:** in development. The backend foundation, authentication, permissions and activity log are done, and the
> admin panel's shell is in place. See the roadmap below.

## Stack

| Part | Technology |
|---|---|
| Backend | Java 21, Spring Boot 4, Spring Modulith, Spring Security (JWT in httpOnly cookies), PostgreSQL 18, Liquibase, Maven |
| Admin panel | React 19, Vite, React Router, TanStack Query, Tailwind CSS 4, Base UI, shadcn-style components |
| Public site | Next.js (App Router), next-intl (TR / EN / AR with RTL) *(planned)* |
| Shared | pnpm workspace, TypeScript (strict), design tokens, API client generated from OpenAPI |
| Tests | JUnit 5, Testcontainers, MockMvc, ArchUnit, Vitest, Testing Library, MSW |
| Infrastructure | Docker Compose |

## Architecture

```
public-web (Next.js)      ──┐
                            ├──▶ backend (Spring Boot, modular monolith) ──▶ PostgreSQL
admin-web (Vite + React)  ──┘
```

- Two APIs with separate OpenAPI specs: `/api/public/**` (anonymous, read-only plus the quote request form) and
  `/api/admin/**` (login required, every endpoint checks a permission).
- Permissions are dynamic: they are declared in code, and the super admin grants them to roles from the admin panel.
  Revoking a permission takes effect on the next request.
- Every change publishes an audit event that is written in the same transaction to an append-only table; the
  application's database user cannot update or delete it.
- The frontends' TypeScript types are generated from the backend's OpenAPI specs; tests on both sides fail when they
  drift apart.

## Project structure

```
backend/     Spring Boot application (modules: shared, identity, audit, ...)
frontend/    pnpm workspace
  apps/admin-web/          admin panel (Vite + React)
  packages/api-client/     OpenAPI specs, generated types, public and admin clients
  packages/tokens/         design tokens for Tailwind (public site and admin panel)
infra/       Docker Compose for development, PostgreSQL init script
```

## Roadmap

- [x] Backend foundation (Spring Boot, Spring Modulith, PostgreSQL, Liquibase, Testcontainers)
- [x] Development infrastructure (Docker Compose, separate schema owner and application database users)
- [x] Authentication (access and refresh tokens in httpOnly cookies, CSRF, login rate limit)
- [x] Roles and dynamic permissions
- [x] Activity log
- [x] Frontend workspace (design tokens, generated API client, RTL lint rule)
- [x] Admin panel shell (login, layout for desktop, tablet and phone, light and dark theme)
- [x] Admin panel: users, roles and activity log screens
- [ ] Public website skeleton (three languages, RTL)
- [ ] CI and production setup
- [ ] Catalogue, quote requests and the public website's content
- [ ] Stock, production and suppliers
- [ ] Quotes, sales and customer accounts
- [ ] Reports

## Getting started (development)

### 1. Requirements

- Docker with Compose v2
- Java 21 (the Maven wrapper is included)
- Node 24 and pnpm (the version is pinned in `frontend/package.json`)
- openssl

### 2. Settings

```bash
git clone https://github.com/mustafabatmaz/burokent.git
cd burokent
cp infra/.env.example infra/.env
```

`infra/.env` holds every setting and secret and is gitignored. Replace each `change-me`:

| Variable | What to put there |
|---|---|
| `POSTGRES_PASSWORD`, `DB_OWNER_PASSWORD`, `DB_APP_PASSWORD` | Any passwords. Liquibase connects as the schema owner, the application as a restricted user |
| `JWT_SECRET` | A random secret for login tokens: `openssl rand -base64 32` |
| `BOOTSTRAP_ADMIN_USERNAME` | The first super admin's user name (lowercase) |
| `BOOTSTRAP_ADMIN_PASSWORD_HASH` | A bcrypt hash of that user's password, inside single quotes (below) |

Create the hash (you are asked for the password, so it never ends up in your shell history):

```bash
docker run --rm -it httpd:2.4-alpine htpasswd -nBC 12 admin
```

Take the part after `admin:`, put `{bcrypt}` in front of it and keep the single quotes:
`BOOTSTRAP_ADMIN_PASSWORD_HASH='{bcrypt}$2y$12$...'`. The super admin is created on the first start; both values can be
removed afterwards.

### 3. Database

```bash
docker compose -f infra/compose.dev.yaml up -d
```

PostgreSQL listens on `127.0.0.1:5433`. The init script creates the two database users only when the data volume is
empty; after changing it, recreate the volume with `docker compose -f infra/compose.dev.yaml down -v` (this deletes
all data).

### 4. Backend

```bash
cd backend
set -a && . ../infra/.env && set +a
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

The API listens on http://localhost:8090 (Swagger UI: `/swagger-ui/index.html`, health: `/actuator/health`). In
IntelliJ, set the active profile to `dev` and load `infra/.env` as the run configuration's environment variables.

### 5. Admin panel

```bash
cd frontend
pnpm install
pnpm --filter @burokent/admin-web dev
```

Open http://localhost:5180 and sign in as the super admin. The Vite dev server passes `/api` to the backend, so the
panel and the API share one origin and the session cookies work as they will in production.

## Checks

Backend (Testcontainers needs Docker running):

```bash
cd backend
./mvnw verify
```

Frontend:

```bash
cd frontend
pnpm lint && pnpm typecheck && pnpm format:check && pnpm test
```

The lint rules reject physical direction classes such as `ml-4` or `text-left`; use the logical ones (`ms-4`,
`text-start`) so layouts also work right-to-left.

## API types

The OpenAPI specs live in `frontend/packages/api-client/openapi/`. After changing the API:

```bash
cd backend
./mvnw test -Dtest=OpenApiSpecTests -Dupdate-specs=true
cd ../frontend
pnpm generate:api
```

## Troubleshooting

- **The backend stops with "bootstrap super admin parameters are missing or invalid":** `BOOTSTRAP_ADMIN_USERNAME`
  or `BOOTSTRAP_ADMIN_PASSWORD_HASH` is missing from `infra/.env`, or the hash lacks the `{bcrypt}` prefix or the
  single quotes.
- **Port 8090, 5180 or 5433 is already in use:** another project is running on it; stop it or change the port in
  `infra/compose.dev.yaml`, `backend/src/main/resources/application.yaml` (`dev` profile) or
  `frontend/apps/admin-web/vite.config.ts`.
- **Login answers "too many attempts":** after 5 failed logins for a user name (20 per address) in 15 minutes, logins
  wait. The counter lives in memory, so restarting the backend clears it.

## License

The source code is licensed under the [MIT License](LICENSE).

The BüroKent name, logo and other brand assets (for example the files in `frontend/apps/admin-web/public/brand/`) are
not covered by this license and may not be used without permission.
