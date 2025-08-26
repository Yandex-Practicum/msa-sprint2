# Установка и настройка Istio для Task 5

## 📋 Предварительные требования

- Minikube запущен
- kubectl настроен
- Docker образы booking-service:v1 и booking-service:v2 собраны

## 🚀 Пошаговая установка

### Шаг 1: Установка Istio

```bash
# 1. Скачать Istio (последняя версия)
curl -L https://istio.io/downloadIstio | sh -

# 2. Перейти в директорию Istio
cd istio-*

# 3. Добавить istioctl в PATH
export PATH=$PWD/bin:$PATH

# 4. Проверить версию
istioctl version --short
```

### Шаг 2: Развёртывание Istio в Minikube

```bash
# 1. Установить Istio с demo профилем
istioctl install --set profile=demo -y

# 2. Дождаться готовности всех компонентов
kubectl wait --for=condition=Ready pods --all -n istio-system --timeout=300s

# 3. Проверить статус
kubectl get pods -n istio-system
```

### Шаг 3: Настройка автоматической инъекции sidecar

```bash
# Включить инъекцию для namespace default
kubectl label namespace default istio-injection=enabled --overwrite

# Проверить метку
kubectl get namespace default --show-labels
```

### Шаг 4: Сборка и загрузка Docker образов

```bash
# Перейти в директорию task5
cd /path/to/task5

# Собрать образ v1
docker build -t booking-service:v1 \
  --build-arg VERSION=1.0.0 \
  ./booking-service

# Собрать образ v2  
docker build -t booking-service:v2 \
  --build-arg VERSION=2.0.0 \
  ./booking-service

# Загрузить в Minikube
minikube image load booking-service:v1
minikube image load booking-service:v2

# Проверить загруженные образы
minikube image ls | grep booking-service
```

### Шаг 5: Деплой микросервисов

```bash
# Деплой версии v1
helm install booking-v1 ./helm/booking-service \
  -f ./helm/booking-service/values-v1.yaml \
  --set-string labels.version=v1

# Деплой версии v2
helm install booking-v2 ./helm/booking-service \
  -f ./helm/booking-service/values-v2.yaml \
  --set-string labels.version=v2

# Дождаться готовности подов
kubectl wait --for=condition=Ready pods -l app=booking-service --timeout=300s

# Проверить поды (должны быть 2 контейнера в каждом)
kubectl get pods -l app=booking-service
```

### Шаг 6: Применение Istio конфигураций

```bash
# Gateway
kubectl apply -f istio/gateway.yaml

# VirtualService
kubectl apply -f istio/virtual-service.yaml

# DestinationRule
kubectl apply -f istio/destination-rule.yaml

# EnvoyFilter
kubectl apply -f istio/envoy-filter.yaml

# Проверить созданные ресурсы
kubectl get gateway,virtualservice,destinationrule,envoyfilter
```

### Шаг 7: Настройка доступа к сервису

#### Вариант 1: Port-forward (рекомендуется для тестирования)

```bash
# Открыть доступ к Istio Ingress Gateway
kubectl port-forward -n istio-system \
  service/istio-ingressgateway 9090:80 &

# Проверить доступность
curl http://localhost:9090/ping
```

#### Вариант 2: Minikube tunnel

```bash
# В отдельном терминале
minikube tunnel

# Получить External IP
kubectl get svc istio-ingressgateway -n istio-system

# Использовать полученный IP для доступа
```

### Шаг 8: Запуск тестов

```bash
# Проверка установки Istio
./check-istio.sh

# Канареечный деплой
./check-canary.sh

# Fallback маршрутизация
./check-fallback.sh

# Feature flag
./check-feature-flag.sh
```

## 🔍 Отладка

### Проверка конфигурации Envoy

```bash
# Конфигурация маршрутов
istioctl proxy-config routes deployment/booking-v1-v1

# Конфигурация кластеров
istioctl proxy-config cluster deployment/booking-v1-v1

# Конфигурация listeners
istioctl proxy-config listeners deployment/booking-v1-v1
```

### Просмотр логов

```bash
# Логи Istio sidecar
kubectl logs -l app=booking-service -c istio-proxy --tail=50

# Логи приложения
kubectl logs -l app=booking-service -c booking-service --tail=50

# Логи Istio control plane
kubectl logs -n istio-system deployment/istiod --tail=50
```

### Мониторинг

```bash
# Kiali Dashboard
istioctl dashboard kiali

# Grafana
istioctl dashboard grafana

# Prometheus
istioctl dashboard prometheus

# Jaeger (трейсинг)
istioctl dashboard jaeger
```

## ⚠️ Возможные проблемы и решения

### Проблема: Поды не стартуют с sidecar

```bash
# Проверить инъекцию
kubectl get namespace default -o jsonpath='{.metadata.labels.istio-injection}'

# Перезапустить поды после включения инъекции
kubectl rollout restart deployment/booking-v1-v1
kubectl rollout restart deployment/booking-v2-v2
```

### Проблема: 503 Service Unavailable

```bash
# Проверить DestinationRule subsets
kubectl get destinationrule booking-service -o yaml

# Проверить метки подов
kubectl get pods -l app=booking-service --show-labels
```

### Проблема: Feature flag не работает

```bash
# Проверить EnvoyFilter
kubectl get envoyfilter booking-feature-flag -o yaml

# Проверить логи Envoy
kubectl logs -l app=booking-service -c istio-proxy | grep "Feature"
```

## 📝 Полезные команды

```bash
# Удалить все Istio ресурсы
kubectl delete -f istio/

# Удалить Helm releases
helm uninstall booking-v1
helm uninstall booking-v2

# Удалить Istio
istioctl uninstall --purge -y

# Убрать метку инъекции
kubectl label namespace default istio-injection-
```

## ✅ Проверка готовности

Система готова к работе, если:
- ✅ Все поды в istio-system запущены
- ✅ Поды booking-service имеют 2 контейнера
- ✅ Gateway, VirtualService, DestinationRule созданы
- ✅ curl http://localhost:9090/ping возвращает ответ
- ✅ Тесты проходят успешно