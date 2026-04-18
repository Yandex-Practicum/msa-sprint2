# Report

## Что было сделано

В рамках задания реализован минимальный REST-сервис `booking-service` и автоматизация его сборки, тестирования и развёртывания в Kubernetes.

## 1. Сервис

Реализован сервис `booking-service`, который:
- собирается через `docker build`
- слушает порт `8080`
- имеет endpoint `/ping`
- имеет endpoint `/ready`
- меняет поведение при `ENABLE_FEATURE_X=true`

Проверка показала, что при включённом feature flag сервис возвращает `pong-feature-x`.

## 2. Docker

Для сервиса создан Dockerfile.
Образ был успешно собран локально и загружен в Minikube через `minikube image load`.

## 3. Helm chart

Реализован Helm chart для `booking-service`, который включает:
- `Deployment`
- `Service` типа `ClusterIP`
- `livenessProbe`
- `readinessProbe`
- параметры из `values.yaml`

Сервис опубликован как:
- `port: 80`
- `targetPort: 8080`

## 4. Конфигурация values

Подготовлены конфигурации:
- `values-staging.yaml`
- `values-prod.yaml`

Через values настраиваются:
- `replicaCount`
- `image.name`
- `image.tag`
- `image.pullPolicy`
- `env`
- `resources`
- `ENABLE_FEATURE_X`

## 5. CI/CD

Подготовлен `.gitlab-ci.yml` со стадиями:
- `build`
- `test`
- `deploy`
- `tag`

Логика пайплайна:
- сборка Docker-образа
- запуск контейнера и проверка `/ping`
- загрузка образа в Minikube
- `helm upgrade --install`
- создание тега с timestamp

## 6. Проверка в Kubernetes

Helm release `booking-service` был успешно установлен.

Проверки подтвердили:
- pod находится в статусе `Running`
- service `booking-service` создан
- локальный `curl` через port-forward успешен
- DNS внутри кластера работает

## 7. Результаты проверки

Успешно подтверждено:
- `kubectl get pods` → pod `booking-service` в статусе `1/1 Running`
- `kubectl get svc` → service `booking-service` создан
- `./check-status.sh` → сервис доступен и отвечает `pong-feature-x`
- `./check-dns.sh` → доступ по адресу `http://booking-service/ping` работает из другого pod внутри Minikube

## Приложенные артефакты

В папку `results` сохранены:
.gitlab-ci.yml
docker image ls + minikube image list.txt
kubectl get pods + get services.txt
report.md
values-prod.yaml
values-staging.yaml
Лог успешной сборки.txt
Скриншот .check-dns.sh .png
Скриншот .check-status.png
Скриншот успешного curl на ping .png