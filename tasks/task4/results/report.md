# Отчёт: задание 4 (автоматизация развёртывания и тестирования)

## Что сделано

### Сервис `booking-service` (Go)

- Образ собирается `docker build` из [`../booking-service/Dockerfile`](../booking-service/Dockerfile) (multi-stage: сборка в `golang:1.21-alpine`, runtime `alpine`, непривилегированный пользователь).
- Эндпоинты: **`/ping`** → `pong`, **`/health`**, **`/ready`**, при **`ENABLE_FEATURE_X=true`** — **`/feature`**.
- Модуль Go: [`../booking-service/go.mod`](../booking-service/go.mod), unit-тест в [`../booking-service/main_test.go`](../booking-service/main_test.go).

### Helm

- Чарт: [`../helm/booking-service/`](../helm/booking-service/).
- **Deployment**: `livenessProbe` и `readinessProbe` — HTTP GET **`/ping`** на порт контейнера 8080 (имя порта `http`).
- **Service**: ClusterIP, порт **80** → **8080**.
- Из **values**: `replicaCount`, `image.name` / `image.tag` / `image.pullPolicy`, массив **`env[]`**, **`resources`**, фича-флаг **`enableFeatureX`** → переменная окружения **`ENABLE_FEATURE_X`**.
- Профили: **`values-staging.yaml`** (`imagePullPolicy: Never`, 1 реплика, флаг включён для проверки), **`values-prod.yaml`** (2 реплики, `IfNotPresent`, выше лимиты).

### CI/CD (`.gitlab-ci.yml`)

- **build**: `docker build -t booking-service:latest ./booking-service`
- **test**: job **`unit_tests`** — `go test ./...`; job **`integration_ping`** — контейнер, проверка **`/ping`**, затем `docker rm`
- **deploy**: при наличии в PATH — `minikube image load`, затем `helm upgrade --install booking-service ... -f values-staging.yaml`
- **tag**: аннотированный git-тег `booking-service-<UTC timestamp>`

Локальный прогон из каталога `tasks/task4` (с монтированием Docker-сокета):

```bash
make ci
```

Если в Docker-job нет `minikube`/`helm`/`kubectl`, шаги деплоя пропускаются с предупреждением; для полного флоу используйте shell executor или выполните load/helm на хосте (см. [`../README.md`](../README.md)).

### Service Discovery

- Имя релиза и сервиса: **`booking-service`** — внутри кластера доступно **`http://booking-service/ping`** (порт сервиса 80).
- Скрипт [`../check-dns.sh`](../check-dns.sh) поднимает временный pod (busybox), выполняет `wget` к сервису, выводит `[INFO]` / `[PASS]`.

### `imagePullPolicy`

- **Staging / Minikube без registry**: **`Never`** — используется образ, загруженный `minikube image load`.
- **Prod**: **`IfNotPresent`** (или **`Always`** при работе с внешним registry) — соответствует боевому сценарию без `load`.

## Артефакты в `results/`

Пошагово, что куда класть: **[`CHECKLIST.md`](CHECKLIST.md)**.

| Файл | Назначение |
|------|------------|
| [`report.md`](report.md) | Этот отчёт (описание изменений и решений) |
| [`values-staging.yaml`](values-staging.yaml) | Копия staging values |
| [`values-prod.yaml`](values-prod.yaml) | Копия prod values |
| [`.gitlab-ci.yml`](.gitlab-ci.yml) | Копия пайплайна |
| `screenshot-curl-ping.png` | Скрин успешного `curl` на `/ping` (положить в эту папку) |
| `screenshot-check-dns.png` | Скрин вывода `./check-dns.sh` |
| `screenshot-check-status.png` | Скрин вывода `./check-status` |
| [`kubectl-pods-services.txt`](kubectl-pods-services.txt) | Вывод `kubectl get pods` + `kubectl get svc booking-service` |
| [`build-log.txt`](build-log.txt) | Полный лог успешного `make ci` |
| [`docker-minikube-images.txt`](docker-minikube-images.txt) | Вывод `docker image ls` и `minikube image list` (строки с `booking-service`) |
