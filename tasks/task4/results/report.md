# Отчёт - Задание 4. Автоматизация развёртывания и тестирования

## Что реализовано

### 1. Docker-образ сервиса `booking-service`

REST-сервис:

| Эндпоинт | Поведение |
|----------|-----------|
| `GET /ping` | Возвращает `pong` (liveness/readinessProbe) |
| `GET /ready` | Возвращает `{"status":"ready"}` |
| `GET /health` | Возвращает `ok` |
| `GET /feature` | Если `ENABLE_FEATURE_X=true` → `200 Feature X is enabled!`; иначе → `404` |

**Unit-тесты** (5 шь, все PASS):
- `TestPing` / `TestReady` / `TestHealth` - базовые хендлеры
- `TestFeatureDisabledByDefault` - `/feature` → 404
- `TestFeatureEnabled` - `/feature` → 200

### 2. Helm-чарт `helm/booking-service/`

**templates/deployment.yaml:**
- `livenessProbe` и `readinessProbe` по HTTP GET `/ping`
- `env[]` из `values.env` (включая `ENABLE_FEATURE_X`)
- `resources` (requests/limits cpu/memory)
- `imagePullPolicy` из `values.image.pullPolicy`

**templates/service.yaml:**
- `ClusterIP`, `port: 80 → targetPort: 8080`

**Два варианта values.yaml:**

| Поле | values-staging.yaml | values-prod.yaml |
|------|---------------------|-------------------|
| `replicaCount` | 1 | 3 |
| `image.pullPolicy` | `Never` (локальный образ) | `IfNotPresent` (registry) |
| `ENABLE_FEATURE_X` | `true` | `false` |
| `resources.limits.cpu` | 250m | 500m |
| `resources.limits.memory` | 160Mi | 256Mi |

`imagePullPolicy: Never` в staging нужен, т.к. образ загружается в Minikube напрямую
через `minikube image load` (Docker Registry не используется). В prod эта строка
удаляется, образ берётся из registry.

### 3. CI/CD-пайплайн (`.gitlab-ci.yml`)

Пять стадий:

| Стадия | Что делает |
|--------|-----------|
| `unit-test` | `go test -v ./...` - unit-тесты Go |
| `build` | `docker build -t booking-service:latest booking-service/` |
| `test` | `docker run` с `ENABLE_FEATURE_X=true`, проверка `/ping`, `/ready`, `/health`, `/feature`, `docker rm` |
| `deploy` | `minikube image load` → `helm upgrade --install` (values-staging) → `kubectl rollout status` |
| `tag` | `git tag "booking-service-<timestamp>"` |


### 4. Service Discovery через DNS

DNS-имя `booking-service` разрешается ClusterIP-сервисом Kubernetes
(Minikube, docker-driver, 1 нода).

---

## Состав

- `values-staging.yaml` - Helm values для staging (1 replica, pullPolicy=Never, feature ON).
- `values-prod.yaml` - Helm values для prod (3 replicas, feature OFF, higher resources).
- `.gitlab-ci.yml` - CI/CD-пайплайн (5 стадий).
- `curl-ping.txt` - Лог успешного `curl /ping → pong`.
- `check-dns.txt` - Лог `./check-dns.sh → Success`.
- `check-status.txt` - Лог `./check-status.sh` (pods + svc + port-forward curl).
- `kubectl-pods-services.txt` - kubectl get pods -A` + `kubectl get services -A`.
- `ci-build-log.txt` - Полный лог `gitlab-ci-local`.
- `docker-ps.txt` - все запущенные контейнеры.
- `docker-image-ls.txt` - `docker image ls`.
- `minikube-image-list.txt` - `minikube image list`.

---