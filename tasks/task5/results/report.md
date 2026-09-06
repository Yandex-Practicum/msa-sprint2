# Задание 5. Настройка управления трафиком с Istio - report

## Что сделано

| Требование задания | Реализация | Артефакт |
|---|---|---|
| Установить Istio (`profile=demo`), включить инъекцию в `default` | `istioctl install --set profile=demo`, метка `istio-injection=enabled` | `check-istio-log.txt`, `pods-and-istio.txt` |
| Две версии сервиса v1 и v2 (с фича-флагом) | Два Helm-релиза одного чарта: `values-v1.yaml` / `values-v2.yaml`; различие - метки `version`, env `VERSION` и `ENABLE_FEATURE_X` | `values-v1.yaml`, `values-v2.yaml`, `check-istio-log.txt` |
| Канареечный релиз 90% v1 / 10% v2 | `VirtualService`, правило `canary-90-10` (`route[].weight`) | `check-canary-log.txt` |
| Fallback-маршрут v1 to v2 при ошибке | `VirtualService`, правило `fallback-any-healthy` (destination БЕЗ subset) | `check-fallback-log.txt` |
| Retry и Circuit Breaking | `DestinationRule`: `connectionPool` + `outlierDetection`; `retries` в `VirtualService` | `destination-rule.yaml` |
| Фича-флаг через EnvoyFilter | `EnvoyFilter` применён (проверен через `istioctl proxy-config routes`); декларативный аналог - `match.headers` в `VirtualService` | `check-feature-flag-log.txt`, `envoy-filter.yaml` |

## Результаты проверок

### 1. Установка Istio и инъекция

`istiod`, `istio-ingressgateway`, `istio-egressgateway` в `Running`. Namespace `default`
помечен `istio-injection=enabled`. Поды `booking-service-v1/v2` - `2/2` (приложение + sidecar Envoy).
Без `2/2` маршрутизация Istio не работала бы, поэтому это первый признак корректности.

### 2. Канареечный релиз

```
всего ответов: 100
v1:            88
v2:            12
ошибок:        0
```

Отклонение от ровных 90/10 - вероятностная природа weighted routing на выборке в 100 запросов.

### 3. Фича-флаг

```
Без заголовка:               {"feature_x":false,"version":"v1"}
С X-Feature-Enabled: true:   {"feature_x":true,"version":"v2"}
```

Маршрутизация по заголовку работает независимо от канареечных весов: новую версию можно
тестировать адресно, не дожидаясь попадания в 10%.

Проверка EnvoyFilter: в route-конфигурации пода-клиента присутствует маршрут с
`x-feature-enabled` в кластер `outbound|80|v2|booking-service...`, добавленный EnvoyFilter
(правило VirtualService с тем же матчем в конфигурации рядом, итоговое поведение одинаковое).

### 4. Fallback

```
При погашенном v1:
  fallback-маршрут (X-Fallback: true, destination без subset): {"version":"v2"}   OK
  обычный канареечный маршрут: no healthy upstream
```

## Ключевые технические решения

1. **Fallback между subset'ами в Istio нативно не работает.** `retries` повторяют запрос
   в тот же Envoy-кластер (тот же subset), а `outlierDetection` исключает эндпоинты ВНУТРИ
   subset, но не отменяет веса. Поэтому при полном отказе v1 весовое правило
   `canary-90-10` отдаёт `no healthy upstream` на те 90%, что адресованы в subset v1
   (это видно в `check-fallback-log.txt`). Рабочий fallback - отдельный маршрут с
   destination БЕЗ subset: Envoy балансирует по всем здоровым эндпоинтам Service, и при
   погашенном v1 запрос обслуживает v2.

   **Почему fallback не сделан через Nginx.** Nginx умеет перехватывать ответы с ошибками
   от upstream и перенаправлять запрос на запасной бэкенд (`proxy_next_upstream` /
   `error_page` + internal redirect) - для точечной задачи fallback он был бы даже удобнее.
   Но это задание целиком построено на Istio: трафик-менеджмент (canary, fallback,
   retries, circuit breaking, feature flag) реализуется декларативно в ресурсах mesh
   (VirtualService/DestinationRule/EnvoyFilter), а Nginx в стеке проекта не используется
   ни на одном уровне (ни в монолите, ни в микросервисах, ни в K8s). Вводить Nginx только
   ради fallback означало бы добавить отдельный прокси-слой вне Istio и отступить от
   условий задачи. В терминах же Istio перенос запроса в другой subset по ошибке не
   поддерживается на уровне VirtualService, поэтому fallback выражен маршрутом без subset.

2. **Две версии - два Helm-релиза одного чарта с общим Service.** Service `booking-service`
   создаётся только релизом v1 (`service.enabled: true`), селектор `app=booking-service`
   (без `version`) - иначе поды обеих версий не попали бы под один host, и DestinationRule
   с subset'ами не к чему было бы применять. Различие версий: pod-метки `version: v1|v2`
   + env `VERSION` и `ENABLE_FEATURE_X`.

3. **Проверки выполняются из пода внутри mesh** (`curl-test` в namespace `default` со
   sidecar'ом), а не через `kubectl port-forward`: port-forward идёт напрямую к поду и
   минует клиентский Envoy, который и применяет правила VirtualService. Проверка через
   `curl http://booking-service/version` из пода-клиента учитывает веса канарейки.

## Как воспроизвести

```bash
istioctl install --set profile=demo -y
kubectl label namespace default istio-injection=enabled --overwrite

docker build -t booking-service:v1 ./booking-service
docker tag booking-service:v1 booking-service:v2
minikube image load booking-service:v1 booking-service:v2

helm upgrade --install booking-service-v1 ./helm/booking-service -f ./helm/booking-service/values-v1.yaml
helm upgrade --install booking-service-v2 ./helm/booking-service -f ./helm/booking-service/values-v2.yaml

kubectl apply -f istio/destination-rule.yaml
kubectl apply -f istio/virtual-service.yaml
kubectl apply -f istio/envoy-filter.yaml

./check-istio.sh
./check-canary.sh
./check-feature-flag.sh
./check-fallback.sh
```

Если поды поднялись как `1/1` (без sidecar) - они созданы до готовности `istiod`.
Лечится: `kubectl rollout restart deployment booking-service-v1 booking-service-v2`.

## Файлы результатов

- `report.md` - этот файл
- `values-v1.yaml`, `values-v2.yaml` - конфигурации двух версий сервиса
- `virtual-service.yaml` - canary + fallback + feature flag
- `destination-rule.yaml` - subsets v1/v2, connectionPool, outlierDetection (Circuit Breaking)
- `envoy-filter.yaml` - feature flag через EnvoyFilter
- `check-istio-log.txt` - установка Istio и инъекция
- `check-canary-log.txt` - распределение 88/12
- `check-feature-flag-log.txt` - фича-флаг
- `check-fallback-log.txt` - fallback-маршрут
- `pods-and-istio.txt` - поды, применённые Istio-ресурсы, версии
