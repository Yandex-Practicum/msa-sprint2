## Что реализовано

1. Обновлен REST-сервис booking.
- Добавлены endpoint'ы: `/ping`, `/health`, `/ready`.
- Добавлено поведение по фича-флагу: `/feature` доступен только при `ENABLE_FEATURE_X=true`.
- Добавлены unit-тесты на Go для ping/ready и поведения фича-флага.

2. Реализован Docker-образ.
- Multi-stage сборка из исходников Go.
- Runtime-образ открывает порт `8080`.
- Добавлен Docker `HEALTHCHECK` на `/ping`.

3. Реализован Helm-чарт.
- Deployment использует значения:
  - `replicaCount`
  - `image.name`, `image.tag`, `image.pullPolicy`
  - `env[]`
  - `resources.requests`, `resources.limits`
  - `ENABLE_FEATURE_X`
- Добавлены `livenessProbe` и `readinessProbe` на `/ping`.
- Service имеет тип `ClusterIP` (`80 -> 8080`).
- Добавлены окруженческие файлы значений:
  - `helm/booking-service/values-staging.yaml`
  - `helm/booking-service/values-prod.yaml`
- Копии этих файлов добавлены в `results/` для сдачи.

4. Реализован CI/CD пайплайн (`.gitlab-ci.yml`).
- `unit`: `go test ./...`
- `build`: `docker build`
- `test`: `docker run` + проверка `/ping` + очистка контейнера
- `deploy`: `minikube image load` + `helm upgrade --install`
- `tag`: создание git-тега с timestamp

5. Обновлены скрипты проверки Service Discovery через DNS.
- `check-dns.sh` проверяет `http://booking-service/ping` из другого pod.
- `check-status.sh` проверяет deployment/service/release и доступность curl локально.

## Что проверено

- `go test ./...` в `booking-service` выполнен успешно.
- `docker build -t booking-service:latest ./booking-service` выполнен успешно.
- Рендер Helm-шаблонов через Docker-образ Helm выполнен успешно:
  - `docker run --rm -v ${PWD}:/work -w /work/tasks/task4 alpine/helm:3.14.0 template booking-service ./helm/booking-service -f ./helm/booking-service/values-staging.yaml`
  - `docker run --rm -v ${PWD}:/work -w /work/tasks/task4 alpine/helm:3.14.0 template booking-service ./helm/booking-service -f ./helm/booking-service/values-prod.yaml`
- Smoke-проверки контейнера выполнены успешно:
  - `/ping` -> `pong`
  - `/health` -> `ok`
  - `/ready` -> `ready`
  - `/feature` при `ENABLE_FEATURE_X=true` -> `Фича X включена!`

## Ограничения окружения во время проверки

- Команда `helm` не установлена локально в этом окружении.
- Команда `minikube` не установлена локально в этом окружении.
- Команда `gitlab-ci-local` не установлена локально в этом окружении.
- Из-за этого runtime-проверки стадии deploy и DNS-проверки подготовлены, но не выполнены прямо здесь.

## Состав `results/`

- `values-staging.yaml`
- `values-prod.yaml`
- `.gitlab-ci.yml`
- `check-dns-output.txt`
- `check-status-output.txt`
- `curl-ping-output.txt`
- `kubectl-get-pods-services.txt`
- `build-log.txt`
- `docker-image-ls-and-minikube-image-list.txt`

## Команды проверки

```bash
gitlab-ci-local unit build test deploy tag
./check-status.sh
./check-dns.sh
kubectl get pods
kubectl get services
docker image ls
minikube image list
```
