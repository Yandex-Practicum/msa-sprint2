# Task 4: автоматизация развертывания

В задании реализован небольшой REST-сервис `booking-service` на Go и инфраструктура для его доставки в Minikube.

## Сервис

Эндпоинты:

- `GET /ping` - проверка доступности, возвращает `pong`;
- `GET /healthz` - healthcheck, возвращает `ok`;
- `GET /ready` - readiness, возвращает `ready`;
- `GET /feature` - доступен только при `ENABLE_FEATURE_X=true`.

Локальная сборка:

```bash
docker build -t booking-service:latest booking-service
```

Локальная проверка:

```bash
docker run -d --name booking-service-ci-test -p 8080:8080 booking-service:latest
curl http://localhost:8080/ping
curl http://localhost:8080/ready
docker rm -f booking-service-ci-test
```

Проверка фича-флага:

```bash
docker run -d --name booking-service-ci-test -p 8080:8080 -e ENABLE_FEATURE_X=true booking-service:latest
curl http://localhost:8080/feature
docker rm -f booking-service-ci-test
```

## Helm

Чарт находится в `helm/booking-service`.

Staging:

```bash
helm upgrade --install booking-service helm/booking-service -f helm/booking-service/values-staging.yaml
```

Prod:

```bash
helm upgrade --install booking-service helm/booking-service -f helm/booking-service/values-prod.yaml
```

В чарте настроены:

- `Deployment` с `readinessProbe` и `livenessProbe` по `/ping`;
- `Service` типа `ClusterIP`, порт `80`, `targetPort` `8080`;
- переменные окружения через `env`;
- requests/limits для CPU и памяти;
- отдельные значения для staging и prod.

Для локального образа в Minikube используется:

```bash
minikube image load booking-service:latest
```

## CI/CD

Локальный запуск пайплайна:

```bash
gitlab-ci-local unit_test build test deploy tag
```

Команда для основных стадий из условия:

```bash
gitlab-ci-local build test deploy tag
```

Основные шаги:

- `unit_test` - запуск `go test` в Docker-контейнере;
- `build` - сборка Docker-образа;
- `test` - запуск контейнера и проверка `/ping` и `/ready`;
- `deploy` - загрузка образа в Minikube и `helm upgrade --install`;
- `tag` - создание git-тега с timestamp.

## Проверка в Kubernetes

Статус деплоя:

```bash
./check-status.sh
```

Проверка DNS Service Discovery из другого пода:

```bash
./check-dns.sh
```

Ожидаемый результат DNS-проверки:

```text
[INFO] Running in-cluster DNS test...
[INFO] DNS Response: pong
[PASS] DNS test succeeded
```

DNS-имя `booking-service` работает внутри кластера. Для доступа с хоста можно использовать port-forward:

```bash
kubectl port-forward svc/booking-service 8080:80
curl http://localhost:8080/ping
```
