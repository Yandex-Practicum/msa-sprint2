# Task 5 - Istio Service Mesh: отчет об изменениях

## Структура

```
task5/
├── booking-service/      # Go-сервис (v1/v2 через SERVICE_VERSION)
├── helm/booking-service/ # Helm-чарт с поддержкой version label
│   ├── values-v1.yaml
│   └── values-v2.yaml
├── istio/
│   ├── gateway.yaml
│   ├── virtual-service.yaml
│   ├── destination-rule.yaml
│   └── envoy-filter.yaml
└── check-*.sh
```

## Реализованные компоненты

### Две версии сервиса

**main.go** обновлен: читает `SERVICE_VERSION` env var.
- `/ping` возвращает `pong (v1)` или `pong (v2, feature-enabled)`
- v2 всегда отдает `/feature`; v1 — только при `ENABLE_FEATURE_X=true`

Деплой двух версий:
```bash
helm upgrade --install booking-service-v1 ./helm/booking-service -f values-v1.yaml
helm upgrade --install booking-service-v2 ./helm/booking-service -f values-v2.yaml
```

Pods получают метки `app: booking-service, version: v1/v2`.
Service `booking-service` выбирает по `app: booking-service` (оба).

### Istio: Gateway (`istio/gateway.yaml`)
Открывает HTTP-трафик через Istio IngressGateway на порт 80.

### Istio: VirtualService (`istio/virtual-service.yaml`)
Два правила:
1. **Feature Flag**: `X-Feature-Enabled: true` → subset v2 (100%)
2. **Canary**: без заголовка → 90% v1, 10% v2
   Retries: 3 попытки, 5s timeout, при `connect-failure,reset,5xx` — автоматический fallback в доступный subset

### Istio: DestinationRule (`istio/destination-rule.yaml`)
- **Subsets**: `v1` (version=v1), `v2` (version=v2)
- **Connection pool**: max 100 TCP connections, 1000 HTTP/2 requests
- **Circuit Breaker** (outlierDetection): после 3 ошибок 5xx подряд — под исключается на 30s

### Istio: EnvoyFilter (`istio/envoy-filter.yaml`)
- При `X-Feature-Enabled: true` добавляет внутренний заголовок `x-envoy-feature-routed: true`
- В ответе добавляет `X-Feature-Route: v2` для видимости маршрутизации

## Установка и проверка

```bash
# 1. Установить Istio
istioctl install --set profile=demo -y
kubectl label namespace default istio-injection=enabled

# 2. Пересоздать поды для инъекции sidecar
kubectl rollout restart deployment booking-service-v1 booking-service-v2

# 3. Применить Istio-конфиги
kubectl apply -f istio/

# 4. Port-forward ingress gateway
kubectl port-forward -n istio-system svc/istio-ingressgateway 9090:80

# 5. Проверки
bash check-istio.sh       # Istio установлен + injection enabled
bash check-canary.sh      # ~90% v1, ~10% v2 на 100 запросов
bash check-feature-flag.sh # X-Feature-Enabled: true -> всегда v2
bash check-fallback.sh    # при v1=0 replicas трафик идет в v2
```

## Пример результатов

```
# check-canary.sh:
v1: 91/100 (91%)
v2: 9/100 (9%)
Expected: ~90% v1, ~10% v2

# check-feature-flag.sh:
Request WITHOUT feature flag: pong (v1)
Request WITH X-Feature-Enabled: true: pong (v2, feature-enabled)
Feature flag routing works: request routed to v2

# check-fallback.sh (v1 scaled to 0):
Request 1: pong (v2, feature-enabled)
...all 10 requests → v2
```
