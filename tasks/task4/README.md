# Task 4 — автоматизация развёртывания и тестирования (booking-service)

## Требования

- Docker, Minikube, Helm, kubectl  
- Node.js + npm (для `gitlab-ci-local`)  
- Опционально: Go 1.21+ для локальных тестов

### Установка gitlab-ci-local

```bash
npm install -g gitlab-ci-local
```

### Minikube

```bash
minikube start --driver=docker
```

## Структура

- `booking-service/` — HTTP-сервис на Go (`:8080`): `/ping` → `pong`, `/health`, `/ready`, при `ENABLE_FEATURE_X=true` — маршрут `/feature`
- `helm/booking-service/` — Helm-чарт
- `.gitlab-ci.yml` — пайплайн: build → test (unit + docker ping) → deploy → tag

## Важно: имя релиза и DNS

Сервис в кластере должен называться **`booking-service`**, чтобы работали `http://booking-service/ping` и селекторы в скриптах.

```bash
helm upgrade --install booking-service ./helm/booking-service \
  -f ./helm/booking-service/values-staging.yaml
```

Имя Kubernetes Service = имя релиза (`{{ .Release.Name }}`).

## Сборка образа и загрузка в Minikube

Выполняйте команды из каталога **`tasks/task4`** (этот README).

```bash
docker build -t booking-service:latest ./booking-service
minikube image load booking-service:latest
```

Для staging в `values-staging.yaml` задано `imagePullPolicy: Never` — образ должен быть загружен в Minikube.

## Деплой (Helm)

Staging (локальный Minikube):

```bash
helm upgrade --install booking-service ./helm/booking-service \
  -f ./helm/booking-service/values-staging.yaml \
  --wait --timeout 120s
```

Prod-профиль (пример настроек под registry):

```bash
helm upgrade --install booking-service ./helm/booking-service \
  -f ./helm/booking-service/values-prod.yaml
```

## Проверки

```bash
chmod +x ./check-dns.sh ./check-status ./check-status.sh
./check-status
./check-dns.sh
```

Проверка с хоста через port-forward:

```bash
kubectl port-forward svc/booking-service 8080:80
curl http://localhost:8080/ping
```

## CI локально (gitlab-ci-local)

Запускайте из **этого каталога** (`tasks/task4`), чтобы пути `./booking-service` и `./helm/...` совпадали с `CI_PROJECT_DIR`.

Job’ы с `docker` должны ходить в **Docker на хосте** через сокет (а не в несуществующий `docker:2375`). В `.gitlab-ci.yml` задано `DOCKER_HOST=unix:///var/run/docker.sock`; нужно **смонтировать сокет** при вызове:

```bash
cd tasks/task4
make ci
```

Makefile вызывает `gitlab-ci-local --volume /var/run/docker.sock:/var/run/docker.sock ...`. На части установок Docker Desktop сокет лежит в `~/.docker/run/docker.sock`:

```bash
make ci DOCKER_SOCK="$HOME/.docker/run/docker.sock"
```

Вручную:

```bash
gitlab-ci-local --volume /var/run/docker.sock:/var/run/docker.sock build test deploy tag
```

**Deploy:** job использует `minikube` и `helm`/`kubectl` из `PATH` контейнера job’а. В типичном `gitlab-ci-local` с Docker-исполнителем этих бинарников нет — тогда шаги load/helm пропускаются с предупреждением, либо используйте [shell executor](https://github.com/firecow/gitlab-ci-local#shell-executor) / запуск `minikube image load` и `helm upgrade` вручную на хосте после успешного `build` и `test`.

**Tag:** стадия `tag` создаёт аннотированный git-тег `booking-service-YYYYMMDDHHMMSS` (UTC).

### Ошибка `docker pull ... context deadline exceeded`

Это таймаут до **Docker Hub** (сеть, VPN, файрвол, DNS). В чарте и `.gitlab-ci.yml` для job-образов задано **`pull_policy: [if-not-present]`**: если образ уже есть локально, повторный pull не выполняется.

Один раз, когда интернет до registry стабилен, подтяните образы:

```bash
docker pull docker:24-cli
docker pull golang:1.21-alpine
docker pull alpine/git:latest
```

Дополнительно можно вызывать:

```bash
gitlab-ci-local --pull-policy if-not-present build test deploy tag
```

(точное имя флага смотрите в `gitlab-ci-local --help` для вашей версии.)

Если образов ещё нет и сеть до `registry-1.docker.io` не проходит — нужно починить доступ (другая сеть/VPN, зеркало registry в настройках Docker, корпоративный прокси).

## Образ результата для сдачи

Артефакты складываются в `results/`: что именно класть и какие команды выполнить — **[`results/CHECKLIST.md`](results/CHECKLIST.md)**; описание решения — [`results/report.md`](results/report.md).
