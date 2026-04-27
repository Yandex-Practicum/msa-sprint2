# Report: task5

## Что сделано

В `task5` перенесена рабочая основа из `task4` и добавлена конфигурация Istio Service Mesh для `booking-service`.

Сервис развертывается в двух версиях:

- `v1`: основная версия, `SERVICE_VERSION=v1`, `ENABLE_FEATURE_X=false`;
- `v2`: новая версия, `SERVICE_VERSION=v2`, `ENABLE_FEATURE_X=true`.

Обе версии имеют общий Kubernetes Service `booking-service`. Helm chart настроен так, чтобы один release создавал общий Service, а версии `v1` и `v2` разворачивались отдельными Deployment с labels `app=booking-service` и `version=v1|v2`.

Для образа используется явный тег `booking-service:task5`, чтобы Minikube не подхватывал устаревший `latest` при повторных проверках.

## Istio

Добавлены манифесты в `istio/`:

- `gateway.yaml` - входной Gateway через `istio-ingressgateway`;
- `virtual-service.yaml` - canary 90% на `v1` и 10% на `v2`, retry policy и feature-flag маршрут только по внутреннему заголовку `x-version-route: v2`;
- `destination-rule.yaml` - subsets `v1`/`v2`, connection pool и outlier detection для circuit breaking. Порог `consecutive5xxErrors=10`, чтобы единичная fallback-проверка не выбрасывала v1 из canary-пула;
- `envoy-filter.yaml` - Lua-фильтр на ingress gateway:
  - для `X-Feature-Enabled: true` добавляет служебный заголовок `x-version-route: v2` и сбрасывает route cache;
  - для аварийного сценария `X-Force-Fail: true` сначала вызывает subset `v1`, проверяет 5xx-ответ, затем вызывает subset `v2` и возвращает ответ с заголовком `x-fallback-from: v1`.

Retry настроен в `VirtualService`, потому что в Istio это свойство HTTP-маршрута. Circuit breaking настроен в `DestinationRule` через `connectionPool` и `outlierDetection`. Feature flag проверяется именно через EnvoyFilter: прямого match по `x-feature-enabled` в `VirtualService` больше нет.

## Проверка

Локально выполнено на Minikube:

- `make unit` - unit-тесты Go через Docker image `golang:1.21-alpine`, успешно;
- `make build` - сборка `booking-service:task5`, успешно;
- `make test` - контейнерный smoke-test `/ping` и `/ready`, успешно;
- контейнерная проверка `v1` и `v2`, успешно:
  - `v1 /ping` возвращает `pong v1`;
  - `v1 /feature` возвращает `404`;
  - `v1 /ping` с `X-Force-Fail: true` возвращает `500`;
  - `v2 /ping` возвращает `pong v2`;
  - `v2 /ping` с `X-Force-Fail: true` остается успешным;
  - `v2 /feature` возвращает `Feature X is enabled on v2`;
- `helm lint` и `helm template` для `values-v1.yaml` и `values-v2.yaml`, успешно;
- `make deploy` - загрузка образа в Minikube, включение sidecar injection, Helm deploy двух версий и применение Istio manifests, успешно;
- `gitlab-ci-local unit_test build test deploy` - все четыре stage прошли успешно;
- `check-istio.sh` - Istio control plane работает, namespace имеет `istio-injection=enabled`, pods сервиса запущены с sidecar, успешно;
- `check-status.sh` - сервис доступен через `istio-ingressgateway`; локальный port-forward использует порт `19090`, чтобы не конфликтовать с task2 gRPC-портом `9090`;
- `check-dns.sh` - in-cluster DNS-запрос к `booking-service` успешен;
- `check-canary.sh` - canary-трафик взвешен в сторону `v1` и доходит до `v2`, последний прогон на 200 запросов: `v1=184`, `v2=16`, `other=0`;
- `check-feature-flag.sh` - 20 из 20 запросов с `X-Feature-Enabled: true` ушли на `v2`, что подтверждает EnvoyFilter-backed routing;
- `check-fallback.sh` - 5 из 5 запросов с `X-Force-Fail: true` сначала проверили отказ `v1`, затем вернулись с `v2` и заголовком `x-fallback-from: v1`.

## Артефакты

- `values-v1.yaml`, `values-v2.yaml` - конфигурации версий сервиса;
- `virtual-service.yaml` - canary, retry и feature-flag маршрут по служебному заголовку от EnvoyFilter;
- `destination-rule.yaml` - subsets, circuit breaking и outlier detection;
- `envoy-filter.yaml` - feature flag и fallback-сценарий через EnvoyFilter;
- `gateway.yaml` - вход через Istio ingress gateway;
- `check-*.sh` и `check-*-output.txt` - проверочные скрипты и результаты локального запуска;
- `go-test-log.txt`, `docker-build-log.txt`, `make-test-log.txt`, `docker-v1-v2-run-log.txt` - логи локальной проверки;
- `deploy-log.txt`, `gitlab-ci-local-log.txt`, `istio-install-log.txt` - логи деплоя и CI;
- `helm-lint-v1.txt`, `helm-lint-v2.txt`, `helm-template-v1.yaml`, `helm-template-v2.yaml` - проверка Helm chart;
- `docker-image-list.txt` - локальный Docker image и образ внутри Minikube;
- `kubectl-istio-resources.txt` - состояние Kubernetes/Istio ресурсов в текущем окружении.
