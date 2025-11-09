# Доработка git-lab-ci

## Что сделано
- Реализован сервис Node.js (:8080) с эндпоинтами `/ping`, `/ready`.
- Фича-флаг `ENABLE_FEATURE_X`: при `true` `/ping` возвращает `{ status: 'ok', featureX: true, ts: ... }`.
- Dockerfile: сборка на node:20-alpine, healthcheck по `/ping`, non-root user.
- Helm-чарт: Deployment + Service (ClusterIP :80 → :8080), liveness/readiness по `/ping`, значения из `values*`, флаг в `.Values.featureFlags.ENABLE_FEATURE_X` и переопределения через `env`.
- Два окружения: `values-staging.yaml` (2 реплики, featureX=true) и `values-prod.yaml` (3 реплики, featureX=false, повышенные ресурсы).
- GitLab CI/CD: `build → unit → test → deploy → tag`.
    - build: `docker build` с тегом `${CI_COMMIT_SHORT_SHA}`.
    - test: `docker run` и `curl /ping` (провал при не-200).
    - deploy: `minikube image load` + `helm upgrade --install` с выбором values по `$ENV`.
    - tag: создаёт git-тег с timestamp и пушит.
- Service Discovery: скрипт `scripts/check-dns.sh` — резолвит `booking-service` и делает HTTP GET `/ping` внутри кластера.

## Локальная проверка
1. Предустановка: Docker, Minikube, Helm, Node.js (nvm), gitlab-ci-local.
2. Запуск кластера: `minikube start --driver=docker`
3. Сборка/запуск локально:
   ```bash
   (cd task4/app && docker build -t booking-service:dev .)
   docker run --rm -p 8080:8080 -e ENABLE_FEATURE_X=true booking-service:dev &
   sleep 1 && curl -fsS http://127.0.0.1:8080/ping