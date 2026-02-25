# Задание 4: Автоматизация доставки booking-service

## Требования к окружению

- Docker
- Minikube
- kubectl
- Helm
- Git
- Node.js и npm (для `gitlab-ci-local`)

Установка локального раннера CI:

```bash
npm install -g gitlab-ci-local
```

Запуск Minikube:

```bash
minikube start --driver=docker
```

## Структура проекта

```text
task4/
|- booking-service/
|- helm/
|  \- booking-service/
|- .gitlab-ci.yml
|- check-dns.sh
|- check-status.sh
\- results/
```

## Сервис

Сервис слушает порт `8080` и предоставляет:

- `GET /ping` -> `pong`
- `GET /health` -> `ok`
- `GET /ready` -> `ready`
- `GET /feature` -> доступен только при `ENABLE_FEATURE_X=true`

## Локальная сборка и запуск

```bash
docker build -t booking-service:latest ./booking-service
docker run --rm -p 8080:8080 -e ENABLE_FEATURE_X=true booking-service:latest
curl http://127.0.0.1:8080/ping
```

## Деплой Helm в Minikube

Используйте значения для staging:

```bash
minikube image load booking-service:latest
helm upgrade --install booking-service ./helm/booking-service \
  -f ./helm/booking-service/values-staging.yaml \
  --set image.name=booking-service \
  --set image.tag=latest
```

Проверка статуса деплоя:

```bash
./check-status.sh
```

Проверка DNS из другого pod:

```bash
./check-dns.sh
```

## Локальная проверка CI

Запуск обязательных стадий:

```bash
gitlab-ci-local build test deploy tag
```

Запуск со стадией unit-тестов:

```bash
gitlab-ci-local unit build test deploy tag
```
