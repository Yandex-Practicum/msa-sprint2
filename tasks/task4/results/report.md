# Task 4 — Автоматизация развёртывания: отчёт

## Что сделано

### 1. booking-service (Go HTTP-сервис)

**`booking-service/main.go`**
- `/ping` — liveness-эндпоинт, возвращает `pong` (HTTP 200)
- `/health` — readiness-эндпоинт, возвращает `ok` (HTTP 200)
- `/feature` — включается при `ENABLE_FEATURE_X=true`, возвращает `Feature X is enabled!`
- Порт: 8080

**`booking-service/Dockerfile`**
- Одностадийный образ на базе `golang:1.21-alpine`
- `RUN go build -o booking-service main.go` — статический бинарник
- `EXPOSE 8080` + `CMD ["./booking-service"]`
- Docker build запускается из корня `tasks/task4/`:
  ```
  docker build -t booking-service:latest -f booking-service/Dockerfile .
  ```

### 2. Helm-чарт (`helm/booking-service/`)

**`values.yaml`** — базовые значения:
- `replicaCount: 1`
- `image.pullPolicy: Never` (для Minikube с локальным образом)
- `env:` с `ENABLE_FEATURE_X=false`
- `resources:` — requests/limits
- `livenessProbe:` — GET `/ping` каждые 10s
- `readinessProbe:` — GET `/health` каждые 5s

**`templates/deployment.yaml`** — добавлены секции:
- `env` из `values.env`
- `resources` из `values.resources`
- `livenessProbe` и `readinessProbe` из values
- `imagePullPolicy` через `values.image.pullPolicy`

**`templates/service.yaml`** — ClusterIP, порт 80 → targetPort 8080.

### 3. Окружения

**`values-staging.yaml`** — staging:
- 1 реплика
- `ENABLE_FEATURE_X=false`
- Лимиты: cpu 250m / memory 128Mi

**`values-prod.yaml`** — production:
- 2 реплики
- `ENABLE_FEATURE_X=true`
- Лимиты: cpu 500m / memory 256Mi

### 4. CI/CD Pipeline (`.gitlab-ci.yml`)

Стадии:
1. **build** — `docker build -t booking-service:latest -f booking-service/Dockerfile .`
2. **test** — запуск контейнера, `curl -f http://localhost:8081/ping`, `docker rm -f`
3. **deploy** — `minikube image load` + `helm upgrade --install` с `values-staging.yaml`
4. **tag** — `git tag booking-service-<timestamp>` (ручной запуск, `when: manual`)

Локальный запуск: `gitlab-ci-local build test deploy tag`

### 5. Service Discovery

**`check-dns.sh`** — запускает `busybox`-под внутри кластера и проверяет `http://booking-service/ping` по DNS-имени сервиса.

**`check-status.sh`** — выводит статус Deployment и Service, даёт команду для port-forward.

## Как развернуть

```bash
# 1. Запустить Minikube
minikube start --driver=docker

# 2. Собрать образ (из tasks/task4/)
cd tasks/task4
docker build -t booking-service:latest -f booking-service/Dockerfile .

# 3. Загрузить в Minikube
minikube image load booking-service:latest

# 4. Установить Helm-чарт (staging)
helm upgrade --install booking-service ./helm/booking-service -f values-staging.yaml

# 5. Проверить статус
kubectl get pods
kubectl get services
./check-status.sh

# 6. Проверить /ping через port-forward
kubectl port-forward svc/booking-service 8080:80 &
curl http://localhost:8080/ping   # → pong
curl http://localhost:8080/health # → ok

# 7. DNS-тест внутри кластера
./check-dns.sh

# 8. CI-пайплайн локально
gitlab-ci-local build test deploy tag
```

## Архитектурные решения

| Решение | Обоснование |
|---|---|
| `imagePullPolicy: Never` | Для Minikube с локальными образами без registry |
| `minikube image load` вместо registry | Простой способ для локальной разработки; в боевом окружении убирается |
| Отдельные `/ping` и `/health` | Liveness ≠ Readiness: сервис может быть жив, но не готов принимать трафик |
| `when: manual` для tag-стадии | Теги создаются вручную — только после подтверждения успешного деплоя |
| `values-staging.yaml` / `values-prod.yaml` | Один чарт, разные профили — стандартный Helm-паттерн |
