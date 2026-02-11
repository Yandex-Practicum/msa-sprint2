# Task 4 - Docker, Helm, CI/CD: отчет об изменениях

## Реализованные компоненты

### Dockerfile (`booking-service/Dockerfile`)
- Базовый образ: `golang:1.21-alpine`
- Установлен `curl` для healthcheck-скриптов
- Сборка Go-бинарника из `main.go`
- Порт `8080`, запуск `./booking-service`
- Эндпоинт `/ping` возвращает `pong` — используется для liveness/readiness проб
- При `ENABLE_FEATURE_X=true` доступен дополнительный эндпоинт `/feature`

### Helm-чарт (`helm/booking-service/`)

**values.yaml** — базовые значения:
- `replicaCount: 1`
- `image.name/tag/pullPolicy`
- `env: [{ENABLE_FEATURE_X: "false"}]`
- `resources` — requests/limits (cpu: 100m/200m, memory: 64Mi/128Mi)
- `livenessProbe` — HTTP GET `/ping:8080`, delay 5s, period 10s
- `readinessProbe` — HTTP GET `/ping:8080`, delay 3s, period 5s

**values-staging.yaml** — overrides для staging:
- `replicaCount: 1`, `ENABLE_FEATURE_X: "true"` (включена фича)

**values-prod.yaml** — overrides для prod:
- `replicaCount: 2`, `ENABLE_FEATURE_X: "false"`, увеличенные ресурсы

**templates/deployment.yaml** — добавлены:
- `env` из `values.env`
- `resources` из `values.resources`
- `livenessProbe` и `readinessProbe` из values

**templates/service.yaml** — ClusterIP, port 80 -> targetPort 8080

### CI/CD Pipeline (`.gitlab-ci.yml`)

4 стадии:
1. **build** — `docker build -t $IMAGE_NAME:$IMAGE_TAG ./booking-service`
2. **test** — запуск контейнера, `curl -f http://localhost:8080/ping`, остановка
3. **deploy** — `minikube image load` + `helm upgrade --install`
4. **tag** — тегирует образ SHA коммита (только на ветке `main`)

### Service Discovery (`check-dns.sh`)
Запускает `busybox` pod внутри кластера и проверяет DNS:
```
wget -qO- http://booking-service/ping
```
Подтверждает, что Kubernetes CoreDNS резолвит `booking-service` -> ClusterIP сервиса.

## Проверка деплоя

```bash
# Запустить CI локально
make ci

# Или вручную:
docker build -t booking-service:latest ./booking-service
minikube image load booking-service:latest

# Деплой staging
helm upgrade --install booking-service ./helm/booking-service \
  -f ./helm/booking-service/values-staging.yaml

# Деплой prod
helm upgrade --install booking-service ./helm/booking-service \
  -f ./helm/booking-service/values-prod.yaml

# Проверить статус
bash check-status.sh

# Проверить Service Discovery
bash check-dns.sh
```

## Пример успешного запроса

```bash
# После port-forward:
kubectl port-forward svc/booking-service 8080:80

curl http://localhost:8080/ping
# -> pong

# С ENABLE_FEATURE_X=true:
curl http://localhost:8080/feature
# -> Feature X is enabled!
```
