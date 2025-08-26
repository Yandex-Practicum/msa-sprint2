# Инструкция по развёртыванию в Minikube

## Предварительные требования

1. Установка Minikube:
```bash
# macOS
brew install minikube

# Linux
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

2. Установка kubectl:
```bash
# macOS
brew install kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

3. Установка Helm:
```bash
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Шаги развёртывания

### 1. Запуск Minikube
```bash
minikube start --driver=docker
```

### 2. Сборка Docker образа
```bash
cd booking-service
docker build -t booking-service:latest .
```

### 3. Загрузка образа в Minikube
```bash
minikube image load booking-service:latest
```

### 4. Установка с помощью Helm

#### Для development:
```bash
helm install booking-service ./helm/booking-service
```

#### Для staging:
```bash
helm install booking-service ./helm/booking-service \
  -f ./helm/booking-service/values-staging.yaml
```

#### Для production:
```bash
helm install booking-service ./helm/booking-service \
  -f ./helm/booking-service/values-prod.yaml
```

### 5. Проверка статуса
```bash
# Проверка pods
kubectl get pods -l app=booking-service

# Проверка service
kubectl get svc booking-service

# Проверка deployment
kubectl get deployment booking-service

# Просмотр логов
kubectl logs -l app=booking-service
```

### 6. Тестирование сервиса

#### Port-forward для локального доступа:
```bash
kubectl port-forward svc/booking-service 8080:80
```

#### В другом терминале:
```bash
# Health check
curl http://localhost:8080/ping

# Readiness check
curl http://localhost:8080/ready

# Status
curl http://localhost:8080/status

# Bookings
curl http://localhost:8080/bookings
```

### 7. DNS Service Discovery

Проверка DNS внутри кластера:
```bash
./check-dns.sh
```

Или вручную:
```bash
kubectl run test-pod --rm -it --image=busybox --restart=Never -- \
  wget -qO- http://booking-service/ping
```

## Обновление деплоя

```bash
# Изменение количества реплик
helm upgrade booking-service ./helm/booking-service \
  --set replicaCount=3

# Включение feature flag
helm upgrade booking-service ./helm/booking-service \
  --set featureFlags.enableFeatureX=true

# Изменение ресурсов
helm upgrade booking-service ./helm/booking-service \
  --set resources.limits.cpu=500m \
  --set resources.limits.memory=512Mi
```

## Удаление

```bash
# Удаление Helm release
helm uninstall booking-service

# Остановка Minikube
minikube stop

# Удаление кластера
minikube delete
```

## Полезные команды

```bash
# Dashboard Minikube
minikube dashboard

# Описание pod
kubectl describe pod <pod-name>

# События в namespace
kubectl get events --sort-by=.metadata.creationTimestamp

# Helm history
helm history booking-service

# Rollback
helm rollback booking-service 1
```