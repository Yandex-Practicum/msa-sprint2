# Task 5: Istio traffic management

В задании используется сервис `booking-service` из task4, развернутый в Kubernetes в двух версиях:

- `v1` - основная версия, `ENABLE_FEATURE_X=false`;
- `v2` - новая версия, `ENABLE_FEATURE_X=true`.

Обе версии обслуживаются одним Kubernetes Service `booking-service`, а трафиком управляет Istio.

## Сервис

Эндпоинты:

- `GET /ping` - возвращает `pong v1` или `pong v2`;
- `GET /healthz` - возвращает `ok`;
- `GET /ready` - возвращает `ready`;
- `GET /version` - возвращает версию приложения;
- `GET /feature` - доступен только в версии с `ENABLE_FEATURE_X=true`.

Локальная сборка:

```bash
docker build -t booking-service:task5 booking-service
```

Локальная проверка:

```bash
make test
```

## Установка Istio

```bash
istioctl install --set profile=demo -y
kubectl label namespace default istio-injection=enabled --overwrite
```

Проверка:

```bash
./check-istio.sh
```

## Развертывание

```bash
docker build -t booking-service:task5 booking-service
minikube image load booking-service:task5

helm upgrade --install booking-service-v1 helm/booking-service -f helm/booking-service/values-v1.yaml --set image.tag=task5
helm upgrade --install booking-service-v2 helm/booking-service -f helm/booking-service/values-v2.yaml --set image.tag=task5

kubectl apply -f istio/
```

То же через Makefile:

```bash
make build
make deploy
```

## Istio Routing

Манифесты лежат в `istio/`:

- `gateway.yaml` - вход через `istio-ingressgateway`;
- `virtual-service.yaml` - canary 90/10, retries и маршрут на `v2` только по служебному заголовку `x-version-route: v2`;
- `destination-rule.yaml` - subsets `v1`/`v2`, connection pool и outlier detection с порогом `consecutive5xxErrors=10`;
- `envoy-filter.yaml` - Lua-фильтр на ingress gateway, который превращает `X-Feature-Enabled: true` в `x-version-route: v2`, а для `X-Force-Fail: true` сначала вызывает `v1`, проверяет 5xx и возвращает fallback-ответ от `v2`.

Для локальной проверки через ingress gateway:

```bash
kubectl -n istio-system port-forward svc/istio-ingressgateway 19090:80
```

В другом терминале:

```bash
curl http://localhost:19090/ping
curl -H "X-Feature-Enabled: true" http://localhost:19090/ping
```

## Проверочные скрипты

```bash
./check-istio.sh
./check-status.sh
./check-canary.sh
./check-feature-flag.sh
./check-fallback.sh
```

Fallback-проверка отправляет запрос с `X-Force-Fail: true`: `v1` отвечает `500`, а маршрут уводит этот аварийный сценарий на `v2`.
В ответе проверяется заголовок `x-fallback-from: v1`, чтобы доказать, что fallback не является прямым маршрутом сразу на `v2`.

```bash
./check-fallback.sh
```

## CI/CD

Локальный запуск:

```bash
gitlab-ci-local unit_test build test deploy
```

Шаг `deploy` устанавливает Istio demo profile, загружает образ в Minikube, включает sidecar injection, разворачивает `v1` и `v2`, применяет Istio-манифесты и ждет rollout обеих версий.
