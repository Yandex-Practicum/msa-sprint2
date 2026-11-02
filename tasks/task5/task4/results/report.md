# Отчет по задаче: CI/CD и Helm для booking-service

## 1. Docker-образ
- Базовый образ: `golang:1.21-alpine`.
- Добавлены зависимости: `curl` для проверок.
- Сервис слушает порт `8080`.
- Эндпоинт `/ping` всегда возвращает `pong` (для проб).
- При переменной окружения `ENABLE_FEATURE_X=true` регистрируется эндпоинт `/feature`, возвращающий `Feature X is enabled!`.

## 2. Helm-чарт
- Создан `Deployment` с `livenessProbe` и `readinessProbe` (проверяют `/ping` на порту 8080).
- Создан `Service` типа `ClusterIP` (порт 80 -> 8080).
- Параметризовано через `values.yaml`:
    - `replicaCount`, `image.*`
    - `env[]` и фича-флаг `enableFeatureX`
    - `resources` (requests/limits)

## 3. CI/CD Пайплайн (GitLab CI)
Реализованы стадии:
- `build`: сборка образа `docker build` и сохранение в артефакт.
- `test`: запуск контейнера через `docker run`, ожидание готовности `/ping`, затем `docker rm -f`.
- `deploy`: загрузка образа в Minikube (`minikube image load`) и деплой через `helm upgrade --install`.
- `tag`: создание git-тега с timestamp и отправка в репозиторий.