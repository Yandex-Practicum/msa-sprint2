# Report — Task 4. Автоматизация развёртывания и тестирования

## Что изменено

### Приложение (Go)
- `booking-service/main.go`
    - `/ping` — liveness.
    - `/ready` — readiness.
    - `/feature` — включается фича-флагом `ENABLE_FEATURE_X=true`.

### Helm-чарт `helm/booking-service`
- `templates/deployment.yaml`
    - Один контейнер `{{ .Chart.Name }}` c образом `{{ .Values.image.name }}:{{ .Values.image.tag }}`.
    - Пробы:
        - liveness → `{{ .Values.livenessProbe.path }}` (порт `http` → `targetPort`).
        - readiness → `{{ .Values.readinessProbe.path }}`.
    - Переменные окружения:
        - `ENABLE_FEATURE_X` по `.Values.featureFlag`.
        - Доп. env из `.Values.env` (массив `{name, value}`), рендерится через `toYaml | nindent 12`.
- `templates/service.yaml`
    - Сервис ClusterIP; `port` → `targetPort`.
- `values.yaml`
    - Базовые параметры: `image`, `service`, `resources`, `probes`, `env: []`, `featureFlag: false`.
- `values-staging.yaml`, `values-prod.yaml`
    - Переопределения (теги образа/ресурсы/фича-флаг/доп. `env`).

### CI (локальный pipeline)
- `.gitlab-ci.yml`
    - **build**: `docker build` образа `booking-service:latest`.
    - **test**: прогон локальных проверок (curl на `/ping`).
    - **deploy**: `minikube image load` + `helm upgrade --install` с `values-staging.yaml`.

## Как воспроизвести

```bash
# 1) Сборка образа
docker build -t booking-service:latest -f booking-service/Dockerfile .

# 2) Загрузка образа в Minikube
minikube image load booking-service:latest

# 3) Деплой
helm upgrade --install booking-service helm/booking-service -f helm/booking-service/values-staging.yaml

# 4) Проверка DNS внутри кластера
./check-dns.sh    # ожидаем Success

# 5) Проверка локально (нужен port-forward)
kubectl port-forward svc/booking-service 8080:80
curl http://localhost:8080/ping  # pong
```
Примечание: если не сделать port-forward, быстрый тест в check-status.sh покажет Not responding — это ожидаемо.