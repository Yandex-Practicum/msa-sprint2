# Отчёт: задание 5 — Istio (канареечный трафик, fallback, circuit breaker, EnvoyFilter)

## Что сделано

### Код и образ

- Сервис: [../booking-service/main.go](../booking-service/main.go). Переменная **`SERVICE_VERSION`** (`v1` / `v2`) добавляется Helm’ом; **`/ping`** отвечает `pong v1` или `pong v2` для проверки канарейки.
- **`ENABLE_FEATURE_X`**: у **v1** выключен, у **v2** включён — эндпоинт **`/feature`** доступен только на новой версии (как в task4).

### Helm (два Deployment, один Service)

- Чарт: [../helm/booking-service/](../helm/booking-service/).
- Два **Deployment**: `{{ release }}-v1` и `{{ release }}-v2` с лейблами **`app: booking-service`** и **`version: v1|v2`**.
- Один **Service** `booking-service` с селектором только **`app: booking-service`**, чтобы оба subset попадали в один хост Istio.
- Базовые значения: [../helm/booking-service/values.yaml](../helm/booking-service/values.yaml). Для Minikube без registry: добавлен [../helm/booking-service/values-minikube.yaml](../helm/booking-service/values-minikube.yaml) (`imagePullPolicy: Never`).

Пример установки приложения:

```bash
cd tasks/task5
docker build -t booking-service:latest ./booking-service
minikube image load booking-service:latest   # при необходимости
helm upgrade --install booking-service ./helm/booking-service \
  -f ./helm/booking-service/values.yaml \
  -f ./helm/booking-service/values-minikube.yaml --wait
kubectl rollout restart deployment/booking-service-v1 deployment/booking-service-v2
```

### Istio: установка и инъекция

1. Скачать Istio и добавить `istioctl` в `PATH` (см. [task-info.md](../task-info.md)).
2. Выполнить [../setup-istio.sh](../setup-istio.sh) или вручную:  
   `istioctl install --set profile=demo -y`  
   `kubectl label namespace default istio-injection=enabled --overwrite`
3. Пересоздать поды приложения после включения инъекции. Ожидание: у подов **2/2** READY (приложение + **istio-proxy**).

### Маршрутизация (артефакты в этой папке)

| Файл | Назначение |
|------|------------|
| [virtual-service.yaml](virtual-service.yaml) | **Gateway** `booking-gateway` на `istio-ingressgateway`; **VirtualService** — приоритетный маршрут по заголовку `x-booking-route-v2: true` → subset **v2**; дефолт — **90% v1 / 10% v2**; **retries** и **timeout** на маршрутах. |
| [destination-rule.yaml](destination-rule.yaml) | **Subsets** `v1` / `v2` по лейблу `version`; **connectionPool** + **outlierDetection** (circuit breaking / выбрасывание проблемных endpoint’ов). |
| [envoy-filter.yaml](envoy-filter.yaml) | **EnvoyFilter** в **`istio-system`**, селектор подов **ingressgateway**: Lua **INSERT_BEFORE** router — при **`X-Feature-Enabled: true`** добавляется внутренний заголовок **`x-booking-route-v2`**, который матчится в VirtualService. |

Применение:

```bash
cd tasks/task5
./apply-routing.sh
# или
kubectl apply -f results/virtual-service.yaml
kubectl apply -f results/destination-rule.yaml
kubectl apply -f results/envoy-filter.yaml
```

Доступ с хоста (как в проверочных скриптах, порт **9090**):

```bash
kubectl port-forward -n istio-system svc/istio-ingressgateway 9090:80
curl -s http://localhost:9090/ping
curl -s -H "X-Feature-Enabled: true" http://localhost:9090/ping   # ожидается pong v2
```

### Канареечный release и фича-флаг

- **90/10** задаётся весами во втором HTTP-блоке VirtualService.
- Заголовок **`X-Feature-Enabled`** обрабатывается **на ingress** через EnvoyFilter; маршрутизация на **v2** — через совпадение с **`x-booking-route-v2`** в VirtualService (без дублирования прямого матча `X-Feature-Enabled` в VS, как требует формулировка задания про EnvoyFilter).

### Retry, circuit breaking и «fallback»

- **Retry** и **таймауты** заданы в **VirtualService** (`retries`, `perTryTimeout`, `timeout`).
- **Circuit breaking / outlier detection** и лимиты пулов — в **DestinationRule** (`connectionPool`, `outlierDetection`).

**Ограничение Istio:** нативно нет простого правила «если subset **v1** вернул 5xx — переключить запрос на **v2**»; ретраи по умолчанию остаются в рамках того же взвешенного маршрута. В отчёте фиксируем:

- **Устойчивость и «fallback» в широком смысле:** ретраи при сетевых сбоях, **outlier detection** (исключение плохих инстансов), **≥2 реплики v1** для сценария «погасить один под» из [check-fallback.sh](../check-fallback.sh).
- Для строгого переключения subset по HTTP-ошибке потребовались бы расширения уровня Envoy (WASM/Lua с повторной маршрутизацией) или изменения в приложении — в рамках задания использованы стандартные механики mesh.

### Профили values для сдачи

- [values-v1.yaml](values-v1.yaml) — акцент на **2 реплики v1**, **1** на v2.
- [values-v2.yaml](values-v2.yaml) — **2 реплики v2**, **1** на v1 (другая конфигурация нагрузки/канарейки).

Установка с выбранным профилем:

```bash
helm upgrade --install booking-service ./helm/booking-service \
  -f ./helm/booking-service/values.yaml -f results/values-v1.yaml
```

### Проверочные скрипты и логи

- [../check-istio.sh](../check-istio.sh), [../check-canary.sh](../check-canary.sh), [../check-fallback.sh](../check-fallback.sh), [../check-feature-flag.sh](../check-feature-flag.sh)
- Примеры вывода: [log-check-istio.txt](log-check-istio.txt), [log-check-canary.txt](log-check-canary.txt), [log-check-fallback.txt](log-check-fallback.txt), [log-check-feature-flag.txt](log-check-feature-flag.txt) (при сдаче можно заменить на фактические логи со своего Minikube).

## Версии окружения (заполнить при сдаче)

- Minikube: `minikube version`
- Kubernetes: `kubectl version --short`
- Istio: `istioctl version`
