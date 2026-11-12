# Flower Evolver, full stack with docker compose #

[FlowerEvolver-frontend](https://github.com/cristianglezm/FlowerEvolver-frontend) with
[FlowerEvolver-backend](https://github.com/cristianglezm/FlowerEvolver-backend) and
[FlowerEvolver-describe](https://github.com/cristianglezm/FlowerEvolver-describe) (the service that writes the
descriptions of the flowers), in `docker/docker-compose.yml`.

Only nginx is open to the outside (80 and 443). The backend, describe, MySQL, Redis and Kafka are not published.

```
browser --https--> nginx (frontend + proxy of /api /download /generated) --> backend --> MySQL, Redis
                                                                               |
                                                        Kafka: descRequests --> describe --> descResponses
```

## Files ##

```
.dockerignore                  the build context is the root of the repository, so it has to be there
docker/                        everything that configures the images and the stack
  docker-compose.yml  docker-compose.podman.yml  .env.example  dockerfile.alpine
  nginx/default.conf.template
  prometheus/  grafana/        monitoring, see the end of this file
.devops/                       the scripts
  init.sh                      makes docker/.env and the secrets
  rewrite_env.sh               writes the .env of vite when the image is built
  deployToGithub.sh            builds the site for GitHub Pages (the deploy-gh-pages workflow runs it)
  docker-entrypoint.d/         run by the nginx container when it starts (certificates)
```

## Local test ##

```bash
.devops/init.sh
cd docker
docker compose up -d --build
```

Open https://localhost and accept the self-signed certificate. `.devops/init.sh` makes `docker/.env` from `docker/.env.example` and fills
the passwords and keys with random values (it never overwrites a value that is set). Run it again if you delete `docker/secrets`: without the key file the engine makes a directory in its place. The first start is slow: the
frontend is built and the models of describe are loaded, `docker compose ps` shows when everything is healthy.

If your system does not let you use ports below 1024 (rootless podman), set in `docker/.env`:

```
HTTP_PORT=8080
HTTPS_PORT=8443
PUBLIC_URL=https://localhost:8443
```

## Server with a domain ##

1. Point the DNS of the domain to the server and open the ports 80 and 443.
2. In `docker/.env`:

   ```
   COMPOSE_PROFILES=monitoring,letsencrypt
   DOMAIN=example.org
   PUBLIC_URL=https://example.org
   LETSENCRYPT_EMAIL=you@example.org
   ```

3. `cd docker && docker compose up -d --build`.

nginx starts with a self-signed certificate. The `certbot` service asks Let's Encrypt for the real one (webroot, over
port 80), and nginx loads it within 5 minutes without being restarted; certbot checks twice a day and renews when it is
due, and nginx loads the renewed certificate the same way. If the DNS is not ready yet, certbot tries again every hour.
`docker compose logs certbot` shows what it says.

To try it first without the limits of Let's Encrypt, set `CERTBOT_ARGS=--test-cert` (the certificates are not trusted by
browsers). To change to the real ones afterwards, delete the test certificate and let certbot ask again:

```bash
docker compose run --rm --entrypoint certbot certbot delete --cert-name example.org
docker compose restart certbot
```

When the real certificate works you can set `HSTS=max-age=31536000`. Do not set it before: browsers remember it.

If something in front of nginx (a CDN, another proxy) makes every request come from its own address, the rate limit of
the backend will count all the clients as one: it reads the address from the `X-Real-IP` header that nginx sets.

## Podman ##

Rootless podman needs a few things that docker does not. `docker-compose.podman.yml` has the one that is a compose
setting (MySQL, which is what the backend's `docker-compose.podman.yml` fixes too), the rest are about the machine:

```bash
cd docker
podman compose -f docker-compose.yml -f docker-compose.podman.yml up -d --build
```

or uncomment `COMPOSE_FILE=docker-compose.yml:docker-compose.podman.yml` in `.env` and run `podman compose up -d --build`.

* **MySQL**: its user is uid 27, which in a rootless container cannot write to a volume; `keep-id` maps it to you. Use it from
  the first start, a volume that mysql created the other way keeps its owners (`podman volume rm flowerevolver_db_data`).
* **Ports below 1024** are not available to rootless podman: set `HTTP_PORT=8080`, `HTTPS_PORT=8443` and
  `PUBLIC_URL=https://localhost:8443` in `.env` (the frontend is built for that address), or allow them once with
  `sudo sysctl net.ipv4.ip_unprivileged_port_start=80`.
* **Image names** are fully qualified (`docker.io/...`): podman does not guess the registry without a terminal.
* **SELinux** (Fedora, RHEL): the bind mounts and volumes carry `:z`/`:Z`, including the metrics key file of Prometheus.
* **Names between containers** (`backend`, `kafka`...) need the netavark network backend (the default from podman 4). nginx
  takes its resolver from the container, so it works with the DNS of podman as it is.
* **The client address**: depending on the podman version and its rootless networking, nginx may see the gateway address
  instead of the one of the browser. Then the rate limit of the backend counts every client as one. `podman compose logs
  frontend` shows which address nginx sees; for a single tester it does not matter.

## Updating ##

```bash
git pull
docker compose pull backend describe     # the published images
docker compose up -d --build             # also builds the frontend again
```

The data (MySQL, `generated/`) are in volumes and are kept. The frontend is built again only when its files or
`PUBLIC_URL` changed.

## Workers and memory ##

* `DESCRIBE_WORKERS` (1): each describe worker loads its own models, about 800 MB of RAM. The `descRequests` topic gets one
  partition per worker (`kafka_init`), which is what lets the workers share the requests: a partition is read by one
  worker only. It needs the describe image with `NWORKERS` support.
* `BACKEND_WORKERS` (2).

## Monitoring (profile `monitoring`) ##

Prometheus and Grafana are published on `127.0.0.1` only, so they are not reachable from the internet. From your
computer, open a tunnel to the server:

```bash
ssh -L 3000:127.0.0.1:3000 -L 9090:127.0.0.1:9090 user@your-server
```

and browse http://localhost:3000 (user `admin`, password `GRAFANA_ADMIN_PASSWORD` of `docker/.env`). The dashboards of the
backend and describe are provisioned from `grafana/provisioning` (see "Prometheus and Grafana files" below).

To look at the dashboards without a tunnel, put Grafana behind nginx on its own subdomain with its own certificate
and login; do not publish Prometheus.

### Grafana Cloud instead of a local Grafana ###

Grafana Cloud has a free tier (10k active series, 14 days of metrics at the time of writing, see grafana.com/pricing).
There are two ways to get the metrics there:

* **A backend elsewhere that you cannot run Prometheus next to**: its `/metrics` is already protected with the bearer
  key, so the *Metrics Endpoint* integration of Grafana Cloud (Connections → Metrics Endpoint) can scrape it directly.
  It needs a public https URL with authentication, and the key without the `Bearer ` prefix.
* **This stack**: keep Prometheus and add a `remote_write` section to `prometheus/prometheus.yml` with the
  url, user and token of your Grafana Cloud stack. Nothing needs to be opened to the outside, Prometheus only makes
  outgoing requests.

The dashboards of this repository select the metrics with `job="flowerevolver-backend"` and
`job="flowerevolver-describe"`, the job names of `prometheus.yml`. Metrics that arrive some other way have other
labels, so the queries of the dashboards have to be adapted to them.

## Single images ##

```bash
# frontend, for the address it will be served from
docker build -f docker/dockerfile.alpine -t flowerevolver-frontend \
    --build-arg REWRITE_ENV=true --build-arg BACKEND=https://example.org .
docker run -d -p 80:80 -p 443:443 -e DOMAIN=example.org flowerevolver-frontend
```

Without `-e API=host:port` the frontend proxies to `backend:5000`; run it in a network where the backend has that name.
The backend and describe images are documented in their own repositories.

## Prometheus and Grafana files ##

The Prometheus and Grafana files of the stack are **copies** that this repository owns,
so the stack does not depend on the other two repositories being checked out next to it.

| File | Copied from | Changes |
|---|---|---|
| `prometheus/prometheus.yml` | `FlowerEvolver-backend/docker/prometheus/prometheus.yml` | service names of this compose (`backend`, `describe`), the metrics key is read from a file (`credentials_file`) instead of being written in the config |
| `prometheus/alert_rules.yml` | `FlowerEvolver-backend` (the same file, it already has the describe, Kafka and Redis rules) | none |
| `grafana/provisioning/datasources/datasource.yml` | `FlowerEvolver-backend` | none (uid `prometheus`) |
| `grafana/provisioning/dashboards/dashboard.yml` | `FlowerEvolver-backend` | none |
| `grafana/provisioning/dashboards/FlowerEvolver-Backend-Observability.json` | `FlowerEvolver-backend` | `id` set to `null` |
| `grafana/provisioning/dashboards/FlowerEvolver-Describe-Observability.json` | `FlowerEvolver-describe/.../Full-System-Observability.json` | see below |

### Changes of the describe dashboard ###

The dashboard was written for the stack of FlowerEvolver-describe, where it is the only service. Here Prometheus scrapes
the backend too, and both expose `http_requests_total`, `http_request_latency_seconds` and
`kafka_messages_processed_total`, so:

* the queries on those three metrics are scoped with `job="flowerevolver-describe"` (otherwise the HTTP and Kafka
  panels would add up the traffic of the backend);
* the datasource uid is `prometheus`, as in `datasource.yml` (it was `Prometheus`, uids are case sensitive, and the
  panels showed "datasource not found");
* `title` and `uid` are `FlowerEvolver Describe Observability` / `fe-describe-observability` (it was "Full System
  Observability" and a generated uid), next to `fe-backend-observability`;
* `id` is `null` (both dashboards had `4`).

When one of the other repositories changes its dashboards or alert rules, diff against these files and port what you
want.

## License

View license information for the software contained in this image in the following links:

* [EvoAI](https://github.com/cristianglezm/EvoAI)
* [EcoSystem](https://github.com/cristianglezm/EcoSystem)

As with all Docker images, these likely also contain other software which may be under other licenses (such as Bash, etc from the base distribution,
along with any direct or indirect dependencies of the primary software being contained).

As for any pre-built image usage, it is the image user's responsibility to ensure that any use of this image
complies with any relevant licenses for all software contained within.
