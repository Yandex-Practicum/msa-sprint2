# Отчёт - Задание 5. Управление трафиком с Istio (Service Mesh)

## Что реализовано

### 1. Установка Istio

В minikube установлен Istio (istioctl install, profile=demo), для namespace
`default` включена автоинъекция sidecar. Контрольная плоскость поднялась:
istiod, istio-ingressgateway, istio-egressgateway - все 1/1 Running. Все поды сервиса поднимаются с sidecar'ом (2/2).

### 2. Приложение: две версии

booking-service (Go) из task4, версия задаётся env `SERVICE_VERSION`, v2
реагирует на заголовок `X-Feature-Enabled: true` (`pong (v2) feature-on`).
Развёрнуто два Helm-release:

- `booking-service-v1` - 9 реплик, создаёт Service `booking-service`;
- `booking-service-v2` - 1 реплика, Service не создаёт.

Service один, selector `app: booking-service` без версии - все 10 подов в одном endpoint-наборе.

### 3. Canary 90/10 и fallback

Canary сделан репликами 9+1 и общим destination, а не весами
VirtualService: weighted-subset на 90/10 не давал failover на v2 при отказе v1
(упор в «no healthy upstream»). Fallback проверен: v1 → 0, все запросы обслужены
v2 (v2=30, errors=0); после возврата v1 канарейка восстановилась.

VirtualService: `X-Feature-Enabled: true` → subset v2 + canary-маршрут с retries.

### 4. Retry и Circuit Breaking (DestinationRule)

- connectionPool: maxConnections 10, http1MaxPendingRequests 2,
  maxRequestsPerConnection 10, maxRetries 3;
- outlierDetection: consecutive5xxErrors 3, interval 5s, baseEjectionTime 30s.

### 5. Фича-флаг через EnvoyFilter

EnvoyFilter (Lua, HTTP_FILTER): при `X-Feature-Enabled: true` ответ помечается
заголовком `x-envoy-feature-flag: on`. Маршрутизация на v2 - правилом
VirtualService (subset v2).

### 6. Вход в кластер

Gateway `booking-gateway` на istio-ingressgateway (hosts `*`, http 80). Проверки
с хоста - nodePort + `Host: booking-service.default.svc.cluster.local`.

---

## Состав

- `values-v1.yaml` / `values-v2.yaml` - Helm values: v1 (9 реплик, basic), v2 (фича-флаг через заголовок).
- `virtual-service.yaml` - canary 90/10 + fallback + фича-флаг.
- `destination-rule.yaml` - Retry/connectionPool + Circuit Breaking/outlierDetection.
- `envoy-filter.yaml` - фича-флаг на уровне Envoy.
- `gateway.yaml` - Gateway на istio-ingressgateway.
- `istio-components.txt` - поды istio-system (istiod + gateways).
- `kubectl-pods-services.txt` - поды (10 x 2/2).
- `istio-endpoints.txt` - endpoints в mesh-кластере.
- `logs/check-istio.log` - компоненты, инъекция, e2e: HTTP 200, pong (v1).
- `logs/check-canary.log` - 200 запросов: v1=179, v2=21, errors=0.
- `logs/check-feature-flag.log` - pong (v2) feature-on + `x-envoy-feature-flag: on`.
- `logs/check-fallback.log` - v1 → 0: v2=30/30; восстановление, errors=0.

---