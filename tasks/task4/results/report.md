# Task 4: Автоматизация развёртывания и тестирования

## ✅ Что было реализовано

### 1. Docker-образ микросервиса
- Dockerfile с Go 1.21-alpine базой
- Установлены зависимости (curl)
- Скомпилирован Go код в бинарник
- Открывает порт 8080
- Эндпоинт `/ping` возвращает `pong`
- Поддержка переменной окружения `ENABLE_FEATURE_X` для включения дополнительного функционала
- Образ успешно собран: `booking-service:latest`
- Загружен в Minikube через `minikube image load`

### 2. Helm-чарт для Kubernetes
- Deployment с правильной конфигурацией:
  - livenessProbe по `/ping` (проверка живости)
  - readinessProbe по `/ping` (проверка готовности)
  - imagePullPolicy: Never (для локального образа)
- Service типа ClusterIP:
  - Порт 80 (внешний)
  - TargetPort 8080 (контейнер)
  - CLUSTER-IP: 10.104.244.107
- Переменные окружения:
  - ENABLE_FEATURE_X (управление функциональностью)
- Resources (requests и limits):
  - Memory requests: 128Mi, limits: 256Mi
  - CPU requests: 100m, limits: 500m
- Два варианта конфигурации:
  - `values.yaml` - базовая конфигурация
  - `values-staging.yaml` - для тестирования (меньше ресурсов)
  - `values-prod.yaml` - для production (больше ресурсов, 3 реплики)

### 3. CI/CD пайплайн (.gitlab-ci.yml)
- **build stage:**
  - `docker build -t booking-service:latest ./booking-service`
- **test stage:**
  - `docker run` контейнера на порту 8080
  - Проверка `/ping` через `curl`
  - Очистка контейнера после тестирования
- **deploy stage:**
  - `minikube image load` загружает образ в Minikube
  - `helm upgrade --install` развёртывает приложение

### 4. Service Discovery через DNS
- Service доступна локально через port-forward (127.0.0.1:8080)
- Service доступна по DNS имени `booking-service` внутри кластера
- Проверка DNS: `kubectl exec pod -- wget http://booking-service/ping` вернула `pong`

### 5. Скрипты проверки
- `check-status.sh` - проверка статуса подов, сервисов и Helm релизов
- `check-dns.sh` - проверка DNS разрешения внутри кластера

---

## 📊 Результаты проверки

### Статус Minikube
```
minikube status
✅ Running
```

### Статус подов
```
kubectl get pods -n default
NAME                               READY   STATUS    RESTARTS   AGE
booking-service-84855cb849-qrhqm   1/1     Running   0          4m52s
```

### Статус Service
```
kubectl get svc -n default
NAME              TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
booking-service   ClusterIP   10.104.244.107   <none>        80/TCP    5m24s
kubernetes        ClusterIP   10.96.0.1        <none>        443/TCP   34m
```

### Тестирование через port-forward
```
kubectl port-forward svc/booking-service 8080:80
curl http://localhost:8080/ping

Результат:
StatusCode: 200
Content: pong
✅ Success
```

### Тестирование DNS внутри кластера
```
kubectl exec -it booking-service-84855cb849-qrhqm -- wget -qO- http://booking-service/ping

Результат:
pong
✅ Success
```

---

## 🏗️ Архитектура решения

```
Git Repository (task4/)
        ↓
.gitlab-ci.yml (CI/CD пайплайн)
   ├─ build: docker build
   ├─ test: docker run + curl /ping
   └─ deploy: minikube image load + helm upgrade
        ↓
Minikube Kubernetes Cluster
   ├─ Deployment: booking-service (1/1 Ready)
   │  └─ Pod: booking-service-84855cb849-qrhqm
   │     └─ Container: Port 8080
   │        ├─ /ping → pong
   │        └─ ENABLE_FEATURE_X (опционально)
   │
   └─ Service: booking-service (ClusterIP)
      ├─ Port: 80
      ├─ TargetPort: 8080
      └─ DNS: booking-service.default.svc.cluster.local
```

---

## 📋 Структура проекта

```
task4/
├── booking-service/
│   ├── main.go                 # Go-приложение с /ping эндпоинтом
│   └── Dockerfile             # Multi-stage Docker образ
├── helm/
│   └── booking-service/
│       ├── Chart.yaml
│       ├── values.yaml         # Базовая конфигурация
│       ├── values-staging.yaml # Конфиг для staging
│       ├── values-prod.yaml    # Конфиг для production
│       └── templates/
│           ├── deployment.yaml # Deployment с probes
│           └── service.yaml    # ClusterIP Service
├── .gitlab-ci.yml             # CI/CD пайплайн
├── check-dns.sh               # Проверка DNS в кластере
├── check-status.sh            # Проверка статуса депло
├── README.md                  # Документация
└── results/
    └── report.md              # Этот файл
```

---

## ✨ Ключевые достижения

1. **Полная автоматизация:** CI/CD пайплайн автоматизирует сборку, тестирование и развёртывание
2. **Масштабируемость:** Helm чарты позволяют легко развёртывать в разных окружениях
3. **Надёжность:** Probes (livenessProbe, readinessProbe) обеспечивают автоматическое восстановление
4. **Сетевое взаимодействие:** Service Discovery работает как локально, так и внутри кластера
5. **Конфигурируемость:** Поддержка фича-флагов через ENABLE_FEATURE_X

---

## 🔧 Использованные инструменты

- **Docker** v29.5.3 - контейнеризация
- **Minikube** v1.38.1 - локальный Kubernetes кластер
- **Helm** v4.1.4 - управление Kubernetes приложениями
- **kubectl** v1.36.2 - управление кластером
- **Go** 1.21-alpine - язык программирования для микросервиса

