#!/bin/sh
# Makes docker/.env from docker/.env.example and fills the secrets that are empty with random values, then writes
# the key that Prometheus reads from a file. Run it again after editing METRICS_API_KEY in docker/.env. Existing
# values are kept. It works from any directory: the files it makes belong in docker/.
set -eu
cd "$(dirname "$0")/../docker"

command -v openssl > /dev/null 2>&1 || { echo "init.sh: openssl is needed to make the secrets" >&2; exit 1; }

[ -f .env ] || cp .env.example .env
chmod 600 .env

# set_if_empty KEY BYTES
set_if_empty() {
    if grep -Eq "^$1=[[:space:]]*$" .env; then
        value=$(openssl rand -hex "$2")
        sed "s|^$1=.*|$1=$value|" .env > .env.tmp && mv .env.tmp .env && chmod 600 .env
        echo "init.sh: made $1"
    fi
}

set_if_empty DB_PASSWD 16
set_if_empty DB_ROOT_PASSWD 16
set_if_empty SECRET_KEY 32
set_if_empty METRICS_API_KEY 32
set_if_empty GRAFANA_ADMIN_PASSWORD 12

# the container of prometheus runs as an unprivileged user, so the file has to be readable by everyone
mkdir -p secrets
grep '^METRICS_API_KEY=' .env | cut -d= -f2- | tr -d '\n' > secrets/metrics_api_key
chmod 644 secrets/metrics_api_key

echo "init.sh: ready, edit docker/.env (DOMAIN and PUBLIC_URL for a server) and run, from the root of the repository: docker compose --env-file docker/.env up -d --build"
