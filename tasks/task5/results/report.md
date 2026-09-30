# Отчёт по заданию task5 — Управление трафиком с Istio

## Цель
Настроить маршрутизацию трафика в Istio: канареечный релиз,
fallback, retry, circuit breaking и фича-флаги без изменений в
бизнес-коде.

## Что сделано

### 1. Установка Istio
- `istioctl install --set profile=demo`.
- Namespace `default` помечен `istio-injection=enabled`.
- Все поды `booking-service` получили sidecar `istio-proxy`
  (READY 2/2, `security.istio.io/tlsMode=istio`).

### 2. Две версии сервиса
- `booking-service-v1` — 2 реплики, метка `version=v1`.
- `booking-service-v2` — 1 реплика, метка `version=v2`, умеет
  включать фичу по заголовку `X-Feature-Enabled: true`.
- Один образ, версия задаётся env-переменной `APP_VERSION`.

### 3. Канареечный релиз (VirtualService)
- 90% трафика → subset `v1`.
- 10% трафика → subset `v2`.
- Проверено `check-canary.sh`: ~90/10.

### 4. Fallback (VirtualService)
- Правило `fallback` матчит заголовок `x-fallback: true` и
  отправляет запрос на subset `v2`.
- Проверено `check-fallback.sh`: при `replicas=0` у v1 запрос
  всё равно получает ответ от v2.

### 5. Retry и Circuit Breaking (DestinationRule)
- `retries`: 3 попытки, `perTryTimeout: 2s`,
  `retryOn: 5xx,gateway-error,connect-failure,refused-stream`.
- `outlierDetection`: `consecutive5xxErrors: 3`, `baseEjectionTime: 30s` —
  больной под исключается из балансировки.
- `connectionPool` ограничивает параллельные запросы: превышение
  даёт 503 (circuit breaking).

### 6. Feature flag через EnvoyFilter
- EnvoyFilter добавляет заголовок `x-feature-source: envoy-filter`,
  когда приходит `X-Feature-Enabled: true`.
- Маршрутизацию на v2 делает VirtualService (правило `feature-flag`).

## Проверочные скрипты и результаты

| Скрипт | Что проверяет | Результат |
|---|---|---|
| `check-istio.sh` | Istio установлен, инъекция работает | istiod Running, 2/2 sidecar |
| `check-canary.sh` | 90/10 между v1 и v2 | ~90% v1, ~10% v2 |
| `check-fallback.sh` | fallback при падении v1 | ответ от v2 |
| `check-feature-flag.sh` | заголовок X-Feature-Enabled | 100% v2 |

## Команды воспроизведения

```bash
istioctl install --set profile=demo -y
kubectl label namespace default istio-injection=enabled --overwrite

helm upgrade --install booking-service ./helm/booking-service

kubectl apply -f destination-rule.yaml
kubectl apply -f virtual-service.yaml
kubectl apply -f envoy-filter.yaml

./check-istio.sh
./check-canary.sh
./check-feature-flag.sh
./check-fallback.sh