# Отчёт по заданию 4 - Автоматизация развёртывания и тестирования (Hotelio / booking-service)

**Итог:** реализован сервис, контейнеризация, Helm-чарт, локальный CI/CD-пайплайн и проверен Service Discovery (DNS) внутри Minikube.

**Содержание**
- Реализован сервис и Docker-образ
- Helm-чарт и конфигурации (staging/prod)
- CI/CD-пайплайн (.gitlab-ci.yml)
- Service Discovery (DNS) и проверки
- Как воспроизвести локально
- Артефакты в `tasks/task4/results/`
- Принятые решения и замечания

## Реализован сервис и Docker-образ
- Сервис: `tasks/task4/booking-service/main.go`
  - Эндпоинты:
    - `GET /ping` - базовая проверка (также для probes)
    - `GET /healthz` - liveness
    - `GET /ready` - readiness
    - `GET /feature` - включается фича‑флагом `ENABLE_FEATURE_X=true`
- Фича‑флаг: читается из переменной окружения `ENABLE_FEATURE_X`.
- Dockerfile: `tasks/task4/booking-service/Dockerfile`
  - Многостейдж: сборка на `golang:1.21-alpine` → рантайм `alpine:3.19`
  - Статически слинкованный бинарник (`CGO_ENABLED=0`, `-ldflags "-s -w"`)
  - Non‑root пользователь, `EXPOSE 8080`

## Helm-чарт и конфигурации
- Чарт: `tasks/task4/helm/booking-service`
  - `templates/deployment.yaml`:
    - image: значения из `.Values.image.{name,tag,pullPolicy}`
    - `env[]` и `ENABLE_FEATURE_X` из values
    - `livenessProbe` и `readinessProbe` по `GET /ping`
    - `resources` (requests/limits) из values
  - `templates/service.yaml`:
    - `ClusterIP`, `port: 80 → targetPort: 8080`
  - `values.yaml` по умолчанию (минимум), плюс дополнительный `env[]`
- Два набора values:
  - `tasks/task4/results/values-staging.yaml` - 1 реплика, `ENABLE_FEATURE_X: true`, лёгкие ресурсы
  - `tasks/task4/results/values-prod.yaml` - 3 реплики, `ENABLE_FEATURE_X: false`, увеличенные ресурсы

## CI/CD-пайплайн
- Файл: `tasks/task4/.gitlab-ci.yml` (копия в `tasks/task4/results/.gitlab-ci.yml`)
- Стадии:
  - `build`: `docker build -t $IMAGE_NAME:$IMAGE_TAG tasks/task4/booking-service`
  - `integration-test` (test): `docker run` с `-e ENABLE_FEATURE_X=true`, проверки `GET /ping` и `GET /feature`, затем `docker rm`
  - `deploy`: `minikube image load` и `helm upgrade --install` с staging‑values; `kubectl rollout status`
  - `create-tag`: git‑тег по timestamp

## Service Discovery (DNS) и проверки
- Сервис устанавливается релизом `booking-service` → доступен из подов по `http://booking-service/ping`.
- Проверка DNS (успешно): `kubectl run dns-test --rm -it --image=busybox --restart=Never -- wget -qO- http://booking-service/ping` → `pong`.
- Проверка статуса и локального доступа:
  - Порт‑форвард: `kubectl port-forward svc/booking-service 8080:80` (или другой локальный порт)
  - `curl http://localhost:<port>/ping` → `pong`



## Принятые решения и замечания
- Выбрана схема без Docker Registry - простая локальная поставка образа в Minikube через `minikube image load` (удобно для локальной проверки полного флоу).
- Сервис по умолчанию `ClusterIP` (требование задания); доступ извне - через `kubectl port-forward`.
- Скрипт `tasks/task4/check-status.sh` доработан:
  - поддержка переменной `PORT` (по умолчанию 8080)
  - удалены BOM/CRLF для корректного исполнения в Git Bash
- В Helm‑чарте `pullPolicy` задаётся через values, probes направлены на `/ping` (совпадает с сервисом).
- В CI `integration-test` проверяет и фича‑флаг (`/feature` при `ENABLE_FEATURE_X=true`).
