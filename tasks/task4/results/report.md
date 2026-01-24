### Изменения

- Сервис `booking-service` реализован на Go. Добавлены эндпоинты `/ping` (healthcheck) и `/ready` (readiness).
- В Helm-чарт добавлены отдельные файлы значений: `values-staging.yaml` и `values-prod.yaml` с различной конфигурацией ресурсов, количества реплик и фича-флагом `ENABLE_FEATURE_X`.
- Установлен и настроен Minikube с драйвером `docker` для локального развёртывания Kubernetes-кластера.
- Настроен CI/CD-пайплайн в `.gitlab-ci.yml` с использованием `gitlab-ci-local`, включающий стадии сборки, тестирования, деплоя и тегирования.

### Шаги по разворачиванию сервиса в Minikube

1. Установить `kubectl` и Minikube согласно официальной документации:  
   [https://kubernetes.io/ru/docs/tasks/tools/install-minikube/](https://kubernetes.io/ru/docs/tasks/tools/install-minikube/)  
   Рекомендуется использовать совместимые версии `kubectl` и Minikube.

2. Установить Helm:  
   ```bash
   curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

3. Установить gitlab-ci-local:
    ```bash
    gitlab-ci-local build test deploy_prod
4. Запустить Minikube с драйвером Docker:
    ```bash
    minikube start --driver=docker

5. Выполнить развёртывание на staging:
    ```bash
    gitlab-ci-local build test deploy_staging

6. Выполнить развёртывание на prod:
    ```bash
    gitlab-ci-local build test deploy_prod

7. Запустить проверочные скрипты:
    ```bash
    ./check-status          # проверка состояния подов и сервиса
    ./check-dns.sh          # проверка DNS-доступности внутри кластера