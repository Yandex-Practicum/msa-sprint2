# Task 4 - отчёт о проделанной работе

## Что сделано

Разработана обвязка для автоматизации CI/CD-процесса микросервиса **booking-service** в локальный Kubernetes-кластер Minikube с помощью Helm.

В процессе развёртывания **booking-service**: 
- Создаётся Docker-образ
- Задействуется Helm-чарт с пробами и values для staging/prod
- Выполняется CI/CD-пайплайн (GitLab CI)
- И как результат выполнения - деплой в Minikube

В зависимости от типа развёртывания (STAGING или PROD) в итоговые конфиги Kubernetes устанавливаются параметры: 
- Фича-флаг ENABLE_FEATURE_X управляет маршрутом /feature.
- Количество реплик
- Параметры среды запуска (CPU, Memory и т.п)

## Изменения по компонентам

### 1. Docker-образ (booking-service/)
- Добавлено открытие порта через EXPOSE 8080.
- Созданный докером образ загружается в Minikube через `minikube image load`.

### 2. Helm-чарт (helm/booking-service/)
- Deployment с livenessProbe и readinessProbe по `/ping` (HTTP GET :8080), periodSeconds вынесены в values (liveness 20, readiness 10).
- Service типа ClusterIP: 80 -> targetPort 8080.
- values.yaml содержит replicaCount, image.name/tag/pullPolicy, env[], resources (requests/limits), ENABLE_FEATURE_X.
- Два файла расширения для values.yaml для кастомизации деплоя под среду развёртывания: values-staging.yaml (replicaCount 1, ENABLE_FEATURE_X=true) и values-prod.yaml (replicaCount 3, ENABLE_FEATURE_X=false).

### 3. CI/CD (.gitlab-ci.yml)
Проработаны стадии:
- build: docker build; 
- test: docker run + проверка /ping + docker rm; 
- deploy: minikube image load + helm upgrade; 
- tag: git-тег с timestamp (main).

### 4. Добавлены скрипты деплоя
- Базовый универсальный скрипт **deploy-common.sh/.bat**: build -> smoke-test /ping -> minikube image load -> helm upgrade -> kubectl rollout status.
- **deploy-staging.*** и **deploy-prod.*** конкретизация деплоя для STAGING или PROD.
- **check-helm.bat** (template+lint), check-dns.sh.

### 5. Service Discovery через DNS
- Внутри Minikube сервис доступен как http://booking-service/ping из другого пода; проверка скриптом check-dns.sh.

## Особенности реализации
1. Пробы по /ping; отдельные /health и /ready endpoints отсутствуют (закрывается пробой /ping).
2. Локальный образ через imagePullPolicy: Never (при деплое скриптами IfNotPresent).
3. DNS-имена работают только внутри кластера, снаружи - kubectl port-forward svc/booking-service 8080:80.


## Запуск сервиса booking-service в minikube

### 1.Запуск Kubernetes cluster ###
*minikube start --driver=docker*

### 2.Проверка статуса Minikube ###
*minikube status*
#### Ожидаемый результат: ####

```text
minikube
type: Control Plane
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured
```

### 3. Билд docker image ###
#### Ожидаемый результат: ####
```text
docker build -t booking-service:1.0.1 ./booking-service
[+] Building 4.4s (12/12) FINISHED                                                                                                             docker:desktop-linux
 => [internal] load build definition from Dockerfile                                                                                                           0.1s
 => => transferring dockerfile: 860B                                                                                                                           0.0s
 => [internal] load metadata for docker.io/library/golang:1.21-alpine                                                                                          1.5s
 => [internal] load .dockerignore                                                                                                                              0.0s
 => => transferring context: 2B                                                                                                                                0.0s
 => [1/7] FROM docker.io/library/golang:1.21-alpine@sha256:2414035b086e3c42b99654c8b26e6f5b1b1598080d65fd03c7f499552ff4dc94                                    0.2s
 => => resolve docker.io/library/golang:1.21-alpine@sha256:2414035b086e3c42b99654c8b26e6f5b1b1598080d65fd03c7f499552ff4dc94                                    0.2s
 => [internal] load build context                                                                                                                              0.0s
 => => transferring context: 61B                                                                                                                               0.0s
 => CACHED [2/7] RUN apk add --no-cache curl                                                                                                                   0.0s
 => CACHED [3/7] WORKDIR /app                                                                                                                                  0.0s
 => CACHED [4/7] COPY main.go .                                                                                                                                0.0s
 => CACHED [5/7] COPY check-dns.sh .                                                                                                                           0.0s
 => CACHED [6/7] RUN chmod +x check-dns.sh                                                                                                                     0.0s
 => CACHED [7/7] RUN go build -o booking-service main.go                                                                                                       0.0s
 => exporting to image                                                                                                                                         2.1s
 => => exporting layers                                                                                                                                        0.0s
 => => exporting manifest sha256:965ec39024063f3c762b361faf1579e9e6083036e0a5771d8094486826d4ad15                                                              0.0s
 => => exporting config sha256:57635c675b445377284800444d5936996e521f2c769e747e8afc729a3e190cdf                                                                0.0s
 => => exporting attestation manifest sha256:9733b00d1cd2ac3785a233ab9047955fd51d6e9718f1cef81e94b172d37fac49                                                  0.1s
 => => exporting manifest list sha256:1518c85d1ba91eca21e3e5d2edc67636a1d21215dd06e718c30d2b4b43a61b6c                                                         0.1s
 => => naming to docker.io/library/booking-service:1.0.1                                                                                                       0.0s
 => => unpacking to docker.io/library/booking-service:1.0.1   
```

### 4. Загрузка image в Minikube ###
*minikube image load booking-service:1.0.1*
#### Ожидаемый результат: ####
Отсутствие вывода при отсутствии ошибок.

### 5. Накат базовой конфигурации ###
*helm upgrade --install booking-service ./helm/booking-service --values ./helm/booking-service/values.yaml*
#### Ожидаемый результат: ####
```text
helm upgrade --install booking-service ./helm/booking-service --values ./helm/booking-service/values-prod.yaml
Release "booking-service" has been upgraded. Happy Helming!
NAME: booking-service
LAST DEPLOYED: Wed Aug 26 16:21:08 2026
NAMESPACE: default
STATUS: deployed
REVISION: 14
DESCRIPTION: Upgrade complete
TEST SUITE: None
```

#### 5.1. Накат конфигурации STAGING ####
helm upgrade --install booking-service ./helm/booking-service --values ./helm/booking-service/values-staging.yaml

**ИЛИ**

#### 5.2. Накат конфигурации PROD ####
*helm upgrade --install booking-service ./helm/booking-service --values ./helm/booking-service/values-prod.yaml*

#### Ожидаемый результат: ####
```text
Release "booking-service" has been upgraded. Happy Helming!
NAME: booking-service
LAST DEPLOYED: Wed Aug 26 19:42:29 2026
NAMESPACE: default
STATUS: deployed
REVISION: 15
DESCRIPTION: Upgrade complete
TEST SUITE: None
```

**Проверка того, то запущены 3 реплики сервиса:**
*kubectl get pods,svc*
#### Ожидаемый результат: ####
```text
NAME                                   READY   STATUS              RESTARTS   AGE
pod/booking-service-5686488498-kglmm   1/1     Running             0          4h10m
pod/booking-service-5686488498-lm2tq   1/1     Running             0          68s
pod/booking-service-5686488498-trtdn   1/1     Running             0          68s
pod/booking-service-686f8d4749-ns44n   0/1     ErrImageNeverPull   0          68s

NAME                      TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
service/booking-service   ClusterIP   10.99.82.142   <none>        80/TCP    30h
service/kubernetes        ClusterIP   10.96.0.1      <none>        443/TCP   42h
```

### 6.Включение проброса порта контейнера 8080 на машину хоста ###
*kubectl port-forward svc/booking-service 8080:80*

#### Ожидаемый результат: ####
```text
Forwarding from 127.0.0.1:8080 -> 8080
Forwarding from [::1]:8080 -> 8080
```

**Note: Далее всё делаем в другом терминале, так как текущий будет занят проборосом портов.**

### 7. Проверка статуса ###

**Проверка pods/services**
*& 'C:\Program Files\Git\bin\bash.exe' .\check-status.sh*

#### Ожидаемый результат: ####
```text
▶️ Checking booking-service deployment...
NAME                               READY   STATUS    RESTARTS   AGE
booking-service-5686488498-kglmm   1/1     Running   0          3h24m

▶️ Checking service...
NAME              TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
booking-service   ClusterIP   10.99.82.142   <none>        80/TCP    29h

▶️ Helm release:
booking-service default         14              2026-08-26 16:21:08.3281014 +0500 +05   deployed        booking-service-0.1.0   1.0        

▶️ Port-forward to test service locally:
  kubectl port-forward svc/booking-service 8080:80
  Then in another terminal:
    curl http://localhost:8080/ping

▶️ Quick curl (if port-forward already running):
pong✅ Reachable
```

### 8.Проверка резолвинга DNS в кластере ###
*& 'C:\Program Files\Git\bin\bash.exe' .\check-dns.sh*

#### Ожидаемый результат: ####
```text
▶️ Running in-cluster DNS test...
pongpod "dns-test" deleted from default namespace
✅ Success
```

### 9. Ping сервиса ###
Ping с помощью **curl**:
*curl http://localhost:8080/ping*

#### Ожидаемый результат: ####
pong

### 10. Проверка включения/отключения опции ENABLE_FEATURE_X в STAGING/PROD: ###
**Развёртываем службу скрипатами в кластер с опцией STAGING:**
*& 'C:\Program Files\Git\bin\bash.exe' .\deploy-staging.sh*

ИЛИ

*./deploy-staging.bat*

В отдельном терминале запускаем проброс протов:
*kubectl port-forward svc/booking-service 8080:80*

**Проверка**
*curl http://localhost:8080/feature*

#### Ожидаемый результат: ####
*Feature X is enabled!*


#### 10.2. Проверка отключения опции ####
**Развёртываем службу скрипатами в кластер с опцией PROD:**
*& 'C:\Program Files\Git\bin\bash.exe' .\deploy-prod.sh*

ИЛИ

*./deploy-prod.bat*

В отдельном терминале запускаем проброс портов:
*kubectl port-forward svc/booking-service 8080:80*

**Проверка**
*curl http://localhost:8080/feature*

#### Ожидаемый результат: ####
*404 page not found*
