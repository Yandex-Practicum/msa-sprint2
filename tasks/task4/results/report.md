# Отчёт по заданию 4: Автоматизация развёртывания и тестирования

## 1. Docker-образ сервиса
- Реализован REST-сервис на Go (`main.go`) с эндпоинтами `/ping`, `/health`, `/ready` и `/feature`.
- Поведение эндпоинта `/feature` управляется переменной окружения `ENABLE_FEATURE_X`.
- Написан `Dockerfile` с многоэтапной логикой (установка curl, сборка бинарника, запуск).

## 2. Helm-чарт
- Создан полноценный чарт в `helm/booking-service/`.
- В `deployment.yaml` добавлены `livenessProbe` (на `/health`) и `readinessProbe` (на `/ready`).
- Настроены `resources` (requests/limits) и передача переменных окружения (`env`).
- Созданы два файла конфигурации: `values-staging.yaml` (1 реплика, минимальные ресурсы) и `values-prod.yaml` (2 реплики, увеличенные ресурсы, включен `ENABLE_FEATURE_X=true`).

## 3. CI/CD пайплайн (.gitlab-ci.yml)
Реализованы 4 стадии:
- `build`: сборка Docker-образа.
- `test`: запуск контейнера, проверка эндпоинтов через `curl`, очистка.
- `deploy`: загрузка образа в Minikube (`minikube image load`) и деплой через `helm upgrade --install`.
- `tag`: создание git-тега с timestamp (запускается вручную).

## 4. Service Discovery (DNS)
- Успешно проверена внутренняя маршрутизация Kubernetes.
- Временный под (`busybox`) успешно резолвит имя `booking-service` и получает ответ `pong` через внутренний DNS кластера.

## Приложенные артефакты
- Скриншоты успешных проверок (`curl`, `check-dns`, `check-status`).
- Выводы `kubectl get pods/services`, `docker image ls`, `minikube image list`.
- Файлы конфигурации: `.gitlab-ci.yml`, `values-staging.yaml`, `values-prod.yaml`.