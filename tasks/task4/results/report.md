# Задание 4. Docker, Helm, CI/CD и DNS

## Что сделал

Сервис. Взял готовый Go сервис из задания, для задачи его хватает. Добавил /health и /ready. /feature теперь есть всегда, но отвечает только при ENABLE_FEATURE_X=true, иначе 404.

Dockerfile (tasks/task4/booking-service/Dockerfile, Dockerfile сервисов из задания 2 лежат в tasks/task2/results). В исходном был COPY check-dns.sh, а в папке booking-service такого файла нет, сборка падала. Убрал. Сборку сделал в два этапа: собираю в golang:1.21-alpine, запускаю в обычном alpine с curl, так образ сильно меньше.

Helm. В Deployment добавил переменные окружения (ENABLE_FEATURE_X и список env), requests/limits, liveness и readiness пробы по /ping, imagePullPolicy берется из values. Service типа ClusterIP, 80 на 8080.

Два файла values:

- values-staging.yaml, 1 реплика, фича включена
- values-prod.yaml, 3 реплики, фича выключена, ресурсов побольше

CI/CD в .gitlab-ci.yml:

- build: docker build
- test: запускаю контейнер, проверяю curl /ping, удаляю контейнер
- deploy: minikube image load и helm upgrade --install. Тег образа всегда latest, поэтому после helm делаю rollout restart, иначе под не пересоздается
- tag: git тег release-дата-время

Unit тестов в сервисе нет, отдельного шага под них тоже нет.

DNS. Релиз называется booking-service, Service называется так же, поэтому внутри кластера сервис доступен по http://booking-service. check-dns.sh переписал под вывод из задания ([INFO] / [PASS]) и убрал -it, без терминала kubectl run с ним ругается.

## Как развернуть

```bash
minikube start --driver=docker
cd tasks/task4
gitlab-ci-local build test deploy tag

./check-status.sh
./check-dns.sh
kubectl port-forward svc/booking-service 8080:80
curl http://localhost:8080/ping
```

Для prod поменять VALUES_FILE в .gitlab-ci.yml на values-prod.yaml.
