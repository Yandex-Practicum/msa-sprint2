# Задание 4. Автоматизация развёртывания и тестирования - report

## Что сделано

### 1. Docker-образ `booking-service/`

REST-сервис на Go (mock из workspace доработан):
- `GET /ping` => `pong`
- `GET /health` => `ok`
- `GET /ready` => `ready`
- `GET /feature` => включается только при `ENABLE_FEATURE_X=true` (иначе 404).

`Dockerfile` - **многоступенчатая сборка**:
- stage `builder`: `golang:1.21-alpine`, `CGO_ENABLED=0 go build`
- stage runtime: `alpine:3.19` + `curl`
- `HEALTHCHECK curl -fsS http://localhost:8080/health`
- `EXPOSE 8080`, `CMD ["./booking-service"]`

Собирается: `docker build -t booking-service:latest booking-service/` => см. `build-log.txt`, `docker-image-ls.txt`.

### 2. Helm-чарт `helm/booking-service/`

- **Chart.yaml** - name/description/version.
- **templates/deployment.yaml**:
  - `replicas` из `values.yaml`;
  - `image: name:tag`, `imagePullPolicy` из values;
  - `env` генерируется циклом из `values.env` (фича-флаг `ENABLE_FEATURE_X`);
  - `livenessProbe` и `readinessProbe` по `GET /ping` (port 8080);
  - `resources.requests/limits` из values.
- **templates/service.yaml** - Service `ClusterIP`, порт `80 => targetPort 8080`, selector `app: <release>`.
- **values.yaml / values-staging.yaml / values-prod.yaml**:
  - `values.yaml` - default (local/minikube): 1 реплика, `imagePullPolicy: Never`, `ENABLE_FEATURE_X=false`;
  - `values-staging.yaml` - 2 реплики, `IfNotPresent`, флаг выключен;
  - `values-prod.yaml` - 3 реплики, `IfNotPresent`, `ENABLE_FEATURE_X=true`.

`helm lint` - 0 ошибок.

### 3. CI/CD `.gitlab-ci.yml`

Четыре стадии:
- **build**: `docker build -t booking-service:latest booking-service/`;
- **test**: запуск контейнера, `curl /ping` => pong, `docker rm`;
- **deploy**: `minikube image load` + `helm upgrade --install` + `kubectl rollout status`;
- **tag**: `git tag v$(date +%Y%m%d%H%M%S)` + `git push origin --tags`.

Локальный прогон через `gitlab-ci-local` (без Docker Registry: образ грузится в Minikube через `minikube image load`) - все 4 стадии **PASS** (см. `ci-pipeline-log.txt`).

## Файлы результатов

- `report.md` - этот файл
- `values-staging.yaml`, `values-prod.yaml` - варианты конфигурации Helm
- `.gitlab-ci.yml` - CI/CD пайплайн
- `screenshot-curl-ping.jpg` - успешный curl на /ping
- `screenshot-check-dns.jpg` - вывод `./check-dns.sh`
- `screenshot-check-status.jpg` - вывод `./check-status`
- `get-pods-services.txt` - `kubectl get pods + get services + get deployments + helm list`
- `ci-pipeline-log.txt` - лог успешной сборки/пайплайна (build/test/deploy/tag PASS)
- `build-log.txt` - лог `docker build`
- `docker-image-ls.txt` - `docker image ls`
- `minikube-image-list.txt` - `minikube image list`
