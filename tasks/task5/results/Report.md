# Task 5 — отчёт о проделанной работе

## Цель
Настроить управление трафиком микросервиса **booking-service** в Minikube с помощью
**Istio Service Mesh**: канареечный Release (90/10), retries, Circuit Breaking,
фича-флаг через заголовок `X-Feature-Enabled: true` и EnvoyFilter.

## Что сделано

### 1. Istio в Minikube
- Установлен `istioctl` (Windows, версия **1.30.4**, путь `C:\Istio\istio-1.30.4\bin\istioctl.exe`).
- `istioctl install --set profile=demo -y` (istiod + ingress/egress gateway).
- `kubectl label namespace default istio-injection=enabled` — автоинъекция sidecar.
- Поды booking — READY **2/2** (приложение + sidecar Envoy).

### 2. Две версии сервиса (v1 / v2)
- `booking-service/main.go`: `/ping` возвращает `pong-v<APP_VERSION>`;
  при `X-Feature-Enabled: true` --> `pong-v2 (feature enabled)`. Версия из env.
- Deployment `booking-v1` (label `version: v1`, `APP_VERSION=v1`, 3 реплики).
- Deployment `booking-v2` (label `version: v2`, `APP_VERSION=v2`, `ENABLE_FEATURE_X=true`, 1 реплика).
- Service `booking` — selector `app: booking`, порт 80 → targetPort 8080.

### 3. Istio-маршрутизация (`booking-service-traffic.yaml`)
- **Канареечный Release**: VirtualService, вес v1=90 / v2=10.
- **Фича-флаг**: match по заголовку `x-feature-enabled: "true"` → 100% на v2.
- **Retries**: in VirtualService (attempts 3, perTryTimeout 2s).
- **Circuit Breaking**: DestinationRule — connectionPool + outlierDetection.
- **Fallback/устойчивость**: при отказе пода Envoy выводит endpoint из балансировки.

### 4. Фича-флаг через EnvoyFilter (`booking-service-envoy-filter.yaml`)
LUA-фильтр на `HTTP_FILTER` (SIDECAR_OUTBOUND): при `X-Feature-Enabled: true`
добавляет внутренний заголовок `x-feature-route: v2`. Рабочая маршрутизация на v2
подтверждается header-match в VirtualService.

### 5. Cкрипты для деплоя
Для автоматического деплоя в кластер Minikube с применением Helm и Istio запустите `./start-istio.bat`.
Данный скрипт в свою очередь запустит скрипт билда и деплоя с помощью Helm `deploy-common.bat` созданный на основе одноимённого скипта из задачи 4.

### 6. Cкрипты для тестирования
Для тестирования запустите `./run-all-tests.bat` или `run-all-tests.sh`. Эти скрипты последовательно запустят предложенные в задании скрипты `check-istio.sh`, `check-canary.sh`, `check-fallback.sh`, `check-feature-flag.sh`.

Все скрипты выполняются внутри кластера на поде `curl-client`.

## Результаты проверок

### check-istio.sh
```
istiod-... 1/1 Running      (istio-system)
istio-ingressgateway-... 1/1 Running
istio-egressgateway-...  1/1 Running
client version: 1.30.4
istio-injection: enabled
booking-v1-... 2/2 Running
booking-v2-... 2/2 Running
```

### check-canary.sh (100 запросов из mesh)
```
v1=91 v2=9   (≈ 91% v1 / 9% v2)
✅ Канареечный Release работает: ~9% трафика идёт на v2.
```

### check-feature-flag.sh
```
--- Запрос БЕЗ фича-флага ---
pong-v1
--- Запрос С X-Feature-Enabled: true ---
pong-v2 (feature enabled)
✅ Фича-флаг работает.
```

### check-fallback.sh (после удаления одного пода v1)
```
Успешных ответов: 20 / 20
✅ Fallback/устойчивость работает: после отказа пода сервис продолжает отвечать.
```

## Особенности и принятые решения
Для чёткой фиксации порядка действий **используются скрипты в bat-файлах**.