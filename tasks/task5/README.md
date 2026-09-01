# Задание 5. Настройка управления трафиком с Istio

Используем **Istio Service Mesh** в Minikube для управления трафиком микросервиса
**booking**. Добавлены две версии сервиса (v1 / v2), канареечный Release (90/10),
retries, Circuit Breaking, фича-флаг через заголовок `X-Feature-Enabled` и EnvoyFilter.

---

## 1. Требования

- Docker, Minikube, kubectl
- `istioctl` (Windows-сборка). Установлена в `C:\Istio\istio-1.30.4\bin\istioctl.exe`.

Чтобы не зависеть от версии, во скрипте путь задаётся переменной `ISTIOCTL`
(по умолчанию `C:\Istio\istio-1.30.4\bin\istioctl.exe`).

## 2. Установка Istio и деплой

Проще всего одной командой (запуск Minikube, установка Istio, инъекция sidecar,
сборка образа, применение манифестов):

```bash
.\start-istio.bat
```

Последовательность шагов (для проверки/вручную):

```bash
# 1. Кластер
minikube start --memory=4096 --cpus=2
minikube update-context

# 2. Istio (profile=demo)
C:\Istio\istio-1.30.4\bin\istioctl install --set profile=demo -y

# 3. Автоинъекция sidecar в namespace default
kubectl label namespace default istio-injection=enabled --overwrite

# 4. Сборка образа и загрузка в Minikube (делает deploy-common.bat)
#    docker build -t booking-service:latest -t booking-service:<tag> ./booking-service
#    minikube image load booking-service:latest ; minikube image load booking-service:<tag>

# 5. Деплой версий v1/v2 через Helm (обе версии рендерятся из одного релиза, список versions: в values.yaml)
helm upgrade --install booking-service ./helm/booking-service \
    -f ./helm/booking-service/values-staging.yaml \
    --set image.tag=<tag> --set image.pullPolicy=IfNotPresent

# 6. Только Istio-конфиги трафика (VirtualService + DestinationRule + EnvoyFilter)
kubectl apply -f booking-service-traffic.yaml
kubectl apply -f booking-service-envoy-filter.yaml

# 7. Тест-клиент ИЗ mesh (нужен, чтобы запросы шли через Envoy и VirtualService работал)
kubectl apply -f test-client.yaml
```

## 3. Что за что отвечает

| Файл | Назначение |
|---|---|
| `booking-service/main.go` | Сервис: `/ping`→`pong-<version>`, при `X-Feature-Enabled: true` → `pong-v2 (feature enabled)`. Версия задаётся env `APP_VERSION`. |
| `helm/booking-service` | Helm-chart: оба Deployment (`booking-service-v1`/`v2`) рендерятся из одного релиза (цикл по `versions:` в `values.yaml`) + Service `booking-service`. |
| `booking-service-deployment.yaml` | Статик-аналог Deployment v1 (для ручного деплоя без Helm). |
| `booking-service-deployment-v2.yaml` | Статик-аналог Deployment v2 (для ручного деплоя без Helm). |
| `booking-service-service.yaml` | Статик-аналог Service (для ручного деплоя без Helm). |
| `booking-service-traffic.yaml` | VirtualService (канарейка 90/10 + фича-флаг + retries) и DestinationRule (subsets v1/v2 + Circuit Breaking). |
| `booking-service-envoy-filter.yaml` | EnvoyFilter (LUA): при `X-Feature-Enabled: true` добавляет внутренний заголовок для маршрутизации на v2. |
| `start-istio.bat` | Полная установка/деплой одной командой (Helm + Istio-конфиги трафика). |

## 4. Управление трафиком (VirtualService / DestinationRule)

**VirtualService `booking-service`** — маршруты по порядку:
1. **Фича-флаг**: `match` по заголовку `x-feature-enabled: exact "true"` → 100% на subset `v2`.
2. **Канарейка + retries**: вес `v1=90`, `v2=10`; `retries` (attempts 3,
   perTryTimeout 2s, retryOn `gateway-error,connect-failure,refused-stream,reset`).

**DestinationRule `booking-service`** — **Circuit Breaking**:
- `trafficPolicy.connectionPool` (maxConnections, maxPendingRequests, maxRequestsPerConnection) — на весь хост и в каждом subset.
- `outlierDetection` (consecutive5xxErrors: 3, interval: 10s, baseEjectionTime: 30s) —
  автоматическое исключение «плохих» подов.

> Примечание: в Istio `retries` задаются в **VirtualService**, а Circuit Breaking
> (connectionPool/outlierDetection) — в **DestinationRule**. Это соответствует
> официальной схеме Istio.

### Fallback (управление отказами)
Istio не делает пер-запросный failover между weighted-подмножествами в рамках одного
маршрута. По ТЗ «погасите один из подов» — скрипт проверяет устойчивость:
удаляется один под `booking-service-v1`, Envoy выводит мёртвый endpoint из балансировки,
retries + outlierDetection направляют трафик на оставшиеся поды; сервис продолжает
отвечать 200. Подробнее — `check-fallback.sh`.

## 5. Проверочные скрипты

Все скрипты используют тест-клиент `curl-client` (из mesh), чтобы трафик проходил
через sidecar Envoy и VirtualService реально применялся (порт-forward напрямую
минует маршрутизацию Istio).

| Скрипт | Что проверяет |
|---|---|
| `check-istio.sh` | Поды istio-system, версия istioctl, метка инъекции, sidecar (2/2). |
| `check-canary.sh` | 100 запросов из mesh → распределение v1/v2 (ожидание ~90/10). |
| `check-fallback.sh` | Удаляет один под v1 → все запросы 200 → восстанавливает. |
| `check-feature-flag.sh` | Запрос с `X-Feature-Enabled: true` попадает на v2. |

Запуск (из папки `task5`):

```bash
bash check-istio.sh
bash check-canary.sh
bash check-feature-flag.sh
bash check-fallback.sh
```

## 6. Результаты

Файлы результатов и скриншоты в папке `results/`, сводный отчёт — `results/Report.md`.