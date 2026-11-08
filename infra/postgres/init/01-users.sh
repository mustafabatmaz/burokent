#!/bin/sh
# Runs once, when the data directory is first initialised.
# Creates the schema owner (used by Liquibase) and the restricted application user.
# Table-level privileges are granted by Liquibase, not here.
set -eu

: "${DB_OWNER_USER:?}" "${DB_OWNER_PASSWORD:?}" "${DB_APP_USER:?}" "${DB_APP_PASSWORD:?}"

psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    -v db="$POSTGRES_DB" \
    -v owner="$DB_OWNER_USER" \
    -v owner_password="$DB_OWNER_PASSWORD" \
    -v app="$DB_APP_USER" \
    -v app_password="$DB_APP_PASSWORD" <<'SQL'
CREATE ROLE :"owner" LOGIN PASSWORD :'owner_password';
CREATE ROLE :"app" LOGIN PASSWORD :'app_password';

ALTER DATABASE :"db" OWNER TO :"owner";
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO :"owner", :"app";

ALTER SCHEMA public OWNER TO :"owner";
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO :"app";
SQL
