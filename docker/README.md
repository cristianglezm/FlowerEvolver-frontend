# docker/

Prometheus and Grafana files of the full stack (`docker-compose.yml`). They are **copies** that this repository owns,
so the stack does not depend on the other two repositories being checked out next to it.

| File | Copied from | Changes |
|---|---|---|
| `prometheus/prometheus.yml` | `FlowerEvolver-backend/docker/prometheus/prometheus.yml` | service names of this compose (`backend`, `describe`), the metrics key is read from a file (`credentials_file`) instead of being written in the config |
| `prometheus/alert_rules.yml` | `FlowerEvolver-backend` (the same file, it already has the describe, Kafka and Redis rules) | none |
| `grafana/provisioning/datasources/datasource.yml` | `FlowerEvolver-backend` | none (uid `prometheus`) |
| `grafana/provisioning/dashboards/dashboard.yml` | `FlowerEvolver-backend` | none |
| `grafana/provisioning/dashboards/FlowerEvolver-Backend-Observability.json` | `FlowerEvolver-backend` | `id` set to `null` |
| `grafana/provisioning/dashboards/FlowerEvolver-Describe-Observability.json` | `FlowerEvolver-describe/.../Full-System-Observability.json` | see below |

## Changes of the describe dashboard

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
