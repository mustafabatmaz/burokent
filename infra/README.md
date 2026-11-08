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

The init script in `postgres/init/` only runs when the data volume is empty. After changing it, recreate the volume:

```bash
docker compose -f infra/compose.dev.yaml down -v
```
