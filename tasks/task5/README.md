# Task 5: Настройка управления трафиком с Istio

## 🎯 Цель задания

Настроить маршрутизацию трафика с использованием Istio Service Mesh для микросервиса booking-service, реализовать канареечный деплой, circuit breaking и управление через feature flags.

## 📁 Структура проекта

```
task5/
├── booking-service/           # Микросервис с поддержкой версий
│   ├── main.go               # Код с feature flags и версионированием
│   ├── Dockerfile            # Multi-stage build
│   └── go.mod
├── helm/                     # Helm charts
│   └── booking-service/
│       ├── templates/        # Kubernetes манифесты
│       ├── values-v1.yaml   # Конфигурация для v1
│       └── values-v2.yaml   # Конфигурация для v2
├── istio/                    # Istio конфигурации
│   ├── gateway.yaml         # Входная точка
│   ├── virtual-service.yaml # Маршрутизация
│   ├── destination-rule.yaml # Circuit breaking
│   └── envoy-filter.yaml    # Feature flags
├── check-*.sh               # Тестовые скрипты
└── results/                 # Результаты выполнения
    ├── report.md           # Отчёт
    ├── istio-setup.md      # Инструкция по установке
    └── test-logs/          # Логи тестов

```

## ✅ Реализованный функционал

### 1. **Версионирование сервиса**
- v1 (1.0.0) - стабильная версия
- v2 (2.0.0) - новая версия с расширенными возможностями

### 2. **Канареечный деплой**
- 90% трафика → v1
- 10% трафика → v2

### 3. **Feature Flags**
- Заголовок `X-Feature-Enabled: true` направляет 100% трафика на v2

### 4. **Fallback маршрутизация**
- При сбое v1 автоматическое переключение на v2

### 5. **Circuit Breaking**
- Защита от каскадных сбоев
- Outlier detection для исключения проблемных инстансов

## 🚀 Быстрый старт

### 1. Установка Istio
```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH
istioctl install --set profile=demo -y
kubectl label namespace default istio-injection=enabled
```

### 2. Сборка и деплой
```bash
# Сборка образов
docker build -t booking-service:v1 --build-arg VERSION=1.0.0 ./booking-service
docker build -t booking-service:v2 --build-arg VERSION=2.0.0 ./booking-service

# Загрузка в Minikube
minikube image load booking-service:v1
minikube image load booking-service:v2

# Деплой сервисов
helm install booking-v1 ./helm/booking-service -f ./helm/booking-service/values-v1.yaml
helm install booking-v2 ./helm/booking-service -f ./helm/booking-service/values-v2.yaml
```

### 3. Применение Istio конфигураций
```bash
kubectl apply -f istio/
```

### 4. Тестирование
```bash
# Port-forward
kubectl port-forward -n istio-system svc/istio-ingressgateway 9090:80

# Запуск тестов
./check-istio.sh
./check-canary.sh
./check-fallback.sh
./check-feature-flag.sh
```

## 📊 Результаты тестирования

### Канареечный деплой
- ✅ v1: ~90 запросов (90%)
- ✅ v2: ~10 запросов (10%)

### Feature Flag
- ✅ Без флага: v1=90%, v2=10%
- ✅ С флагом: v1=0%, v2=100%

### Fallback
- ✅ При отказе v1: 100% трафика на v2

## 📖 Документация

- [Детальный отчёт](results/report.md)
- [Инструкция по установке Istio](results/istio-setup.md)
- [Логи тестирования](results/test-logs/)

## 🛠️ Полезные команды

```bash
# Мониторинг
istioctl dashboard kiali
istioctl dashboard grafana

# Отладка
istioctl proxy-config routes deployment/booking-v1-v1
kubectl logs -l app=booking-service -c istio-proxy

# Очистка
kubectl delete -f istio/
helm uninstall booking-v1 booking-v2
```

## 📝 Ключевые особенности реализации

1. **Приоритетная маршрутизация** - Feature flags имеют приоритет над канареечным деплоем
2. **Zero-downtime deployment** - Плавное переключение между версиями
3. **Observability** - Детальное логирование через EnvoyFilter
4. **Resilience** - Автоматическое восстановление при сбоях

## ✨ Достижения

- 🎯 Безопасное внедрение новых версий
- 🔄 Автоматическое восстановление при сбоях
- 🚦 Гибкое управление трафиком
- 🧪 A/B тестирование через feature flags
- 🛡️ Защита от каскадных сбоев

---

**Task 5 успешно выполнен!** 🎉

Все компоненты протестированы и готовы к использованию в production окружении.