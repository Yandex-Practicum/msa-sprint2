# Подготовка окружения
Перед началом убедитесь, что на машине установлены:
Требуемое ПО:
- Docker
- Minikube
- Helm
- Node.js + npm — желательно через nvm
- gitlab-ci-local

# Команды установки (Ubuntu/WSL)

## Установка nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts

## Установка gitlab-ci-local
npm install -g gitlab-ci-local

## Запуск Minikube
minikube start --driver=docker

# Структура проекта

task4/</br>
├── booking-service/              # REST-сервис (Node/Java/etc)</br>
├── helm/</br>
│   └── booking-service/          # Helm-чарт сервиса</br>
├── .gitlab-ci.yml                # CI/CD пайплайн (требуется доработка)</br>
├── check-dns.sh                  # Проверка DNS внутри кластера</br>
├── check-status                  # Статус деплоя и curl локально</br>
├── README.md                     # Этот файл</br>

# Что нужно реализовать

1. Docker-образ сервиса
	- Либо на базе имеющегося booking-service, либо на базе предложенного в задаче
- Собирается с помощью docker build
- Открывает порт 8080
- Возвращает /ping → pong
- Поведение сервиса меняется при наличии переменной ENABLE_FEATURE_X=true

2. Helm-чарт:

- Deployment с пробами:
	- livenessProbe и readinessProbe по /ping
- Service типа ClusterIP (порт 80 → targetPort 8080)
- Значения из values.yaml:
	- replicaCount
	- image.name, image.tag, image.pullPolicy
	- env[] — переменные окружения	
	- resources — requests и limits
	- ENABLE_FEATURE_X — фича-флаг

Обязательно сделайте два варианта values.yaml: для staging и prod

3. CI/CD пайплайн (.gitlab-ci.yml):

Стадии:
- build: docker build
- test: docker run, проверка /ping
- deploy: minikube image load и helm upgrade
- tag: создать git-тег с timestamp (можно сделать вручную)

! Используйте gitlab-ci-local:
gitlab-ci-local build test deploy tag

4. 🔎 Service Discovery через DNS

- Проверка: http://booking-service/ping работает из другого пода внутри Minikube
- Используйте скрипт check-dns.sh

# Проверка корректности

## Проверка сервисов:

./check-status

Пример вывода:

▶️ Checking booking-service deployment...
NAME                             READY   STATUS    RESTARTS   AGE
booking-service-78d99d7dd5-abc   1/1     Running   0          1m

▶️ Checking service...
NAME              TYPE        CLUSTER-IP      PORT(S)   AGE
booking-service   ClusterIP   10.96.170.171   80/TCP    1m

▶️ Port-forward to test service locally:
kubectl port-forward svc/booking-service 8080:80
Then: curl http://localhost:8080/ping

## Проверка DNS внутри кластера:

./check-dns.sh

Ожидаемый вывод:

▶️ Running in-cluster DNS test...
pong
✅ Success


# Подсказки:

- imagePullPolicy: Never нужен для использования локального образа
- minikube image load копирует образ внутрь Minikube
- DNS имена booking-service работают только внутри кластера

Для доступа снаружи используйте:
```bash
kubectl port-forward svc/booking-service 8080:80
curl http://localhost:8080/ping
```