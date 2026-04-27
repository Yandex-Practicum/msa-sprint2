# Report: task4

## Что сделано

Реализован сервис `booking-service` на Go:

- `GET /ping` возвращает `pong`;
- `GET /healthz` возвращает `ok`;
- `GET /ready` возвращает `ready`;
- `GET /feature` доступен только при `ENABLE_FEATURE_X=true`.

Dockerfile заменен на multi-stage сборку:

- на build stage запускается `go test ./...`;
- собирается статический бинарник;
- runtime образ основан на `alpine:3.20`;
- контейнер запускается от отдельного пользователя;
- добавлен Docker `HEALTHCHECK` по `/ping`.

Helm chart доработан:

- `Deployment` использует `replicaCount`, `image.name`, `image.tag`, `image.pullPolicy`;
- `readinessProbe` и `livenessProbe` настроены на `/ping`;
- переменные окружения передаются через `env`;
- CPU и memory requests/limits вынесены в values;
- `Service` типа `ClusterIP` открывает порт `80` и направляет трафик на `targetPort: 8080`;
- добавлены `values-staging.yaml` и `values-prod.yaml`.

CI/CD pipeline доработан в `.gitlab-ci.yml`:

- `unit_test` запускает unit-тесты в Docker-контейнере с Go;
- `build` собирает Docker image;
- `test` запускает контейнер и проверяет `/ping` и `/ready`;
- `deploy` загружает image в Minikube и выполняет `helm upgrade --install`;
- `tag` создает git tag с timestamp.

Service Discovery проверяется через `check-dns.sh`: временный pod `busybox` выполняет запрос `http://booking-service/ping` внутри кластера.

## Проверки

Выполнено локально:

- unit-тесты через `docker run golang:1.21-alpine go test ./...` - успешно, лог: `go-test-log.txt`;
- `docker build -t booking-service:latest booking-service` - успешно, лог: `docker-build-log.txt`;
- `make test` - успешно, лог: `make-test-log.txt`;
- запуск контейнера без фича-флага - `/ping=pong`, `/ready=ready`, `/feature` недоступен;
- запуск контейнера с `ENABLE_FEATURE_X=true` - `/feature` возвращает `Feature X is enabled!`;
- `helm template` для staging и prod - успешно;
- `helm lint` для staging и prod - успешно;
- `make deploy` загрузил образ в Minikube и выполнил `helm upgrade --install`;
- `gitlab-ci-local unit_test build test deploy` успешно прошел без tag-стадии, чтобы не создавать лишний локальный git-тег во время проверки;
- `./check-status.sh` подтвердил Running pod, ClusterIP service, Helm release и `/ping=pong` через port-forward;
- `./check-dns.sh` подтвердил доступность `http://booking-service/ping` из pod внутри Minikube.

## Артефакты

- `values-staging.yaml` и `values-prod.yaml` - варианты values для окружений;
- `.gitlab-ci.yml` - CI/CD pipeline;
- `docker-build-log.txt` - лог Docker-сборки;
- `docker-run-test-log.txt` - проверка контейнера и фича-флага;
- `make-test-log.txt` - проверка Makefile target `test`;
- `curl-ping-output.txt` - успешный host curl на `/ping`;
- `docker-ps-after-tests.txt` - проверка, что тестовый контейнер удален;
- `go-test-log.txt` - unit-тесты;
- `helm-lint-staging.txt` и `helm-lint-prod.txt` - проверка Helm chart;
- `helm-template-staging.yaml` и `helm-template-prod.yaml` - результат рендера чарта;
- `deploy-log.txt` и `gitlab-ci-local-log.txt` - логи deploy и локального CI;
- `check-status-output.txt`, `check-dns-output.txt`, `kubectl-get-pods-services.txt` - реальная проверка Kubernetes и DNS в Minikube;
- `docker-image-and-minikube-image-list.txt` - список локальных Docker images и состояние Minikube image list.
