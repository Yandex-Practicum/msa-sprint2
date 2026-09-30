# Отчёт по заданию task4

## Цель
Ускорить доставку фич, уменьшить количество ошибок при выкладке и
упростить масштабирование в Kubernetes.

## Что сделано

### 1. Docker-образ `booking-service`
- `booking-service/Dockerfile` — одностадийная сборка на `golang:1.21-alpine`.
- Сервис слушает `:8080`.
- Endpoints:
  - `/ping` → `pong` (используется liveness/readiness пробами);
  - `/feature` → доступен только при `ENABLE_FEATURE_X=true`.

### 2. Helm-чарт `helm/booking-service`
- `Deployment`:
  - `livenessProbe` и `readinessProbe` по `/ping:8080`;
  - `env[]` из `values.env` (включая `ENABLE_FEATURE_X`);
  - `resources.requests/limits` из values;
  - `imagePullPolicy: Never` для локального образа в Minikube.
- `Service` типа `ClusterIP`, `port: 80 → targetPort: 8080`.
- Три набора values:
  - `values.yaml` — дефолт (`replicaCount: 1`, feature off);
  - `values-staging.yaml` — `replicaCount: 2`, `ENABLE_FEATURE_X=true`;
  - `values-prod.yaml` — `replicaCount: 3`, `ENABLE_FEATURE_X=false`, увеличенные ресурсы.

### 3. CI/CD `.gitlab-ci.yml`
Стадии: `build → test → deploy → tag`.
- build — `docker build`;
- test — `docker run`, `curl /ping`, `docker rm`;
- deploy — `minikube image load` + `helm upgrade --install`;
- tag — git-тег с timestamp.

Локальный запуск:
```bash
gitlab-ci-local --shell-isolation build test deploy tag