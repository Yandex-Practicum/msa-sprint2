# Report

## Что было сделано

В рамках задания для сервиса `booking-service` было настроено управление трафиком через Istio в Kubernetes-кластере Minikube.

## 1. Установка и базовая настройка Istio

В кластер был установлен Istio. Для namespace `default` была включена автоматическая sidecar-injection, чтобы pod’ы сервиса запускались вместе с Envoy sidecar. Это подтвердилось тем, что pod’ы `booking-service` и `booking-service-v2` были в статусе `2/2 Running`, то есть содержали и основной контейнер приложения, и `istio-proxy`. Кроме того, в namespace `istio-system` были доступны основные компоненты Istio, включая `istiod`, `istio-ingressgateway` и `istio-egressgateway`.

## 2. Две версии сервиса

Были развернуты две версии `booking-service`:

- `v1` — основная версия сервиса
- `v2` — версия с включённым feature flag

Для разделения версий использовались label’ы pod’ов:
- `version: v1`
- `version: v2`

Это было необходимо для настройки Istio subsets через `DestinationRule`. В результирующей конфигурации одновременно работали две версии сервиса:
- `booking-service` с `version=v1`
- `booking-service-v2` с `version=v2`

## 3. Canary routing

Для маршрутизации трафика был настроен `VirtualService`, который распределял запросы между версиями сервиса:

- `90%` трафика направлялось на `v1`
- `10%` трафика направлялось на `v2`

Результат проверки canary был зафиксирован в `check-canary.txt`:

- `v1(pong): 90`
- `v2(pong-feature-x): 10`

Это подтвердило корректную работу canary release.

## 4. Feature flag routing

Для проверки feature flag использовался заголовок:

- `X-Feature-Enabled: true`

При его наличии запрос направлялся на `v2`, и сервис возвращал ответ:

- `pong-feature-x`

Это подтверждено логом `check-feature-flag.txt`.

## 5. Retry и Circuit Breaking

Для сервиса был настроен `DestinationRule`, который включал:

- subsets `v1` и `v2`
- connection pool
- retries
- outlier detection / circuit breaking

Такая конфигурация соответствует возможностям Istio для повышения устойчивости сервиса: `VirtualService` управляет HTTP routing и retry policy, а `DestinationRule` задаёт subsets и traffic policy, включая connection pool и outlier detection.

## 6. Реализация fallback

По условию задания требовалось реализовать fallback-маршрут, который перенаправляет трафик с `v1` на `v2`, если `v1` возвращает ошибку.

В ходе реализации было установлено, что стандартная комбинация `VirtualService` с weighted routing и `DestinationRule` с retries/outlier detection корректно решает задачи распределения трафика и повышения устойчивости, но не даёт детерминированного per-request failover вида:  
**«если `v1` вернул ошибку, этот же запрос сразу перенаправляется в `v2`»**. В случае полного отказа upstream Envoy может вернуть `503`, а fallback-логику в таких случаях обычно требуется реализовывать на уровне приложения или управляемого маршрута.

Поэтому для аварийного сценария был реализован **управляемый fallback-маршрут**:

- при недоступности `v1` масштабирование `booking-service` уменьшалось до `0`
- применялась fallback-конфигурация `VirtualService`, которая направляла `100%` трафика на `v2`
- после этого запросы успешно обслуживались `v2`

Проверка fallback показала ответ:

- `pong-feature-x`

Это подтверждено в `check-fallback.txt`.

## 7. EnvoyFilter

В проект был добавлен `envoy-filter.yaml`. Он сохранён как часть итоговой конфигурации task5. Основная логика маршрутизации по feature flag в минимальной рабочей конфигурации была реализована через `VirtualService` по HTTP header.

## 8. Итоги проверки

В ходе выполнения задания было подтверждено:

- Istio установлен и работает
- automatic sidecar injection включён
- одновременно работают две версии `booking-service`
- canary routing `90/10` работает корректно
- feature flag routing по заголовку работает корректно
- retries / circuit breaking / outlier detection настроены
- fallback работает как управляемый аварийный сценарий с переключением маршрута на `v2`

## 9. Состав артефактов

В папке `results` сохранены:

- `values-v1.yaml`
- `values-v2.yaml`
- `virtual-service.yaml`
- `virtual-service-fallback.yaml`
- `destination-rule.yaml`
- `envoy-filter.yaml`
- `deployment-v2.yaml`
- `check-istio.txt`
- `check-canary.txt`
- `check-feature-flag.txt`
- `check-fallback.txt`
- `pods-with-labels.txt`
- `deployments.txt`
- `report.md`