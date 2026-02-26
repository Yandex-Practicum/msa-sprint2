# Задание 5: маршрутизация трафика booking-service через Istio

## Требования к окружению

- Docker
- Minikube
- kubectl
- Helm
- istioctl
- Bash
- jq (используется в `check-istio.sh`)

## 1. Установка Istio в Minikube

```bash
istioctl install --set profile=demo -y
kubectl label namespace default istio-injection=enabled --overwrite
```

Проверка:

```bash
kubectl get pods -n istio-system
kubectl get namespace default --show-labels
```

## 2. Сборка образа и деплой booking-service (v1 + v2)

```bash
cd tasks/task5

docker build -t booking-service:latest ./booking-service
minikube image load booking-service:latest

helm upgrade --install booking-service ./helm/booking-service \
  -f ./helm/booking-service/values-staging.yaml \
  --set image.name=booking-service \
  --set image.tag=latest

kubectl rollout status deployment/booking-service-v1 --timeout=120s
kubectl rollout status deployment/booking-service-v2 --timeout=120s
```

## 3. Что настроено в Istio

- `Gateway`: `booking-service-gateway`
- `VirtualService`:
  - канареечный rollout `v1=90%`, `v2=10%`
  - `retry`-политика
  - отдельный роут в `v2` по feature-флагу
- `DestinationRule`:
  - subsets `v1` и `v2`
  - circuit breaking через `connectionPool` и `outlierDetection`
- `EnvoyFilter`:
  - Lua-фильтр на ingress gateway
  - обработка заголовка `X-Feature-Enabled`

## 4. Подготовка перед запуском скриптов

Скрипты `check-canary.sh`, `check-fallback.sh` и `check-feature-flag.sh` отправляют запросы на `http://localhost:9090`.

В отдельном терминале поднимите `port-forward`:

```bash
kubectl -n istio-system port-forward svc/istio-ingressgateway 9090:80
```

## 5. Запуск проверок

```bash
./check-istio.sh
./check-canary.sh
./check-fallback.sh
./check-feature-flag.sh
```

## 6. Что проверяют текущие скрипты

- `check-istio.sh`: наличие pod'ов Istio и label `istio-injection` в namespace `default`.
- `check-canary.sh`: отправляет 100 запросов на `/ping`.
- `check-fallback.sh`: выполняет запрос на `/ping`; при ошибке выводит сообщение `Fallback route working`.
- `check-feature-flag.sh`: выполняет запрос с заголовком `X-Feature-Enabled: true`.

## Примечание

Текущие скрипты базовые. При необходимости можно расширить их автоматической валидацией долей трафика, fallback-сценария и feature-flag маршрутизации.
