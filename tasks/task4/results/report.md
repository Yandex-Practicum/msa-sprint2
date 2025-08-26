# Отчёт о выполнении Task 4: Автоматизация развёртывания и тестирования

## 📋 Описание задания
Автоматизировать развёртывание и тестирование микросервисов Hotelio в Kubernetes с использованием Docker, Helm и CI/CD pipeline.

## ✅ Выполненные задачи

### 1. **Docker-образ booking-service**

#### Реализованный функционал:
- ✅ Multi-stage сборка для оптимизации размера образа
- ✅ Health check endpoint `/ping`
- ✅ Readiness endpoint `/ready` (отдельный от health)
- ✅ Feature flag `ENABLE_FEATURE_X` меняющий поведение сервиса
- ✅ Graceful shutdown с обработкой сигналов
- ✅ Непривилегированный пользователь для безопасности

#### Ключевые особенности:
```dockerfile
# Multi-stage build
FROM golang:1.21-alpine AS builder
# ... сборка ...
FROM alpine:3.18
# Финальный образ ~15MB вместо ~300MB
```

### 2. **Helm Chart**

#### Структура:
```
helm/booking-service/
├── Chart.yaml              # Метаданные чарта
├── values.yaml             # Базовые значения
├── values-staging.yaml     # Конфигурация для staging
├── values-prod.yaml        # Конфигурация для production
└── templates/
    ├── deployment.yaml     # Kubernetes Deployment
    └── service.yaml        # Kubernetes Service
```

#### Реализованные возможности:
- ✅ **Liveness probe**: `/ping` - проверка живучести контейнера
- ✅ **Readiness probe**: `/ready` - готовность принимать трафик
- ✅ **Переменные окружения**: настройка через values.yaml
- ✅ **Ресурсы**: limits и requests для CPU/Memory
- ✅ **Feature flags**: настройка через `featureFlags.enableFeatureX`

#### Сравнение окружений:

| Параметр | Staging | Production |
|----------|---------|------------|
| Реплики | 2 | 3 |
| CPU limit | 150m | 500m |
| Memory limit | 192Mi | 512Mi |
| Feature X | Enabled | Disabled |
| Log level | debug | info |
| Readiness delay | 3s | 10s |

### 3. **CI/CD Pipeline (.gitlab-ci.yml)**

#### Стадии pipeline:
1. **build**: Docker сборка с тегированием
2. **test**: Запуск контейнера и проверка endpoints
3. **deploy**: Загрузка в Minikube и деплой через Helm
4. **tag**: Создание git-тега с timestamp

#### Особенности реализации:
```yaml
stages:
  - build    # Docker build
  - test     # Проверка endpoints и feature flag
  - deploy   # Helm install/upgrade
  - tag      # Git tagging
```

### 4. **Service Discovery через DNS**

#### Механизм работы:
- Kubernetes Service создаёт DNS имя `booking-service`
- Доступ внутри кластера: `http://booking-service/ping`
- Проверка через временный pod с busybox

### 5. **Улучшенный Go сервис**

#### main.go включает:
```go
// Различные endpoints
/ping      - health check (liveness)
/ready     - readiness check
/status    - JSON статус с версией
/bookings  - демо endpoint с данными
/feature   - доступен при ENABLE_FEATURE_X=true

// Graceful shutdown
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
srv.Shutdown(ctx)
```

## 🧪 Результаты тестирования

### Локальный Docker:
```bash
# Запуск контейнера
docker run -d -p 8080:8080 booking-service:latest

# Проверка endpoints
curl http://localhost:8080/ping    # => pong
curl http://localhost:8080/ready   # => ready
curl http://localhost:8080/status  # => {"status":"healthy","version":"1.0.0","ready":true}
```

### С Feature Flag:
```bash
docker run -d -e ENABLE_FEATURE_X=true -p 8080:8080 booking-service:latest
curl http://localhost:8080/feature
# => {"feature":"X","enabled":true,"message":"Feature X is enabled!"}
```

## 🏗️ Архитектура решения

```
┌─────────────────┐     CI/CD Pipeline      ┌─────────────────┐
│  Source Code    │ ──────────────────────> │  Docker Build   │
│   (main.go)     │                          │                 │
└─────────────────┘                          └─────────────────┘
                                                      │
                                                      ▼
┌─────────────────┐                          ┌─────────────────┐
│  Helm Values    │ ──────────────────────> │  Helm Deploy    │
│ (staging/prod)  │                          │                 │
└─────────────────┘                          └─────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                         Kubernetes Cluster                   │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │     Pod 1    │    │     Pod 2    │    │     Pod 3    │ │
│  │ booking-svc  │    │ booking-svc  │    │ booking-svc  │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│           │                  │                    │         │
│           └──────────────────┴────────────────────┘         │
│                              │                               │
│                     ┌────────────────┐                      │
│                     │    Service     │                      │
│                     │ ClusterIP:80   │                      │
│                     └────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Сравнение размеров образов

| Подход | Размер | Преимущества |
|--------|--------|--------------|
| Базовый golang:1.21 | ~300MB | Простота |
| Multi-stage alpine | ~15MB | Оптимальный размер, безопасность |
| Scratch | ~8MB | Минимальный размер |

Выбран Alpine для баланса между размером и функциональностью (curl для probes).

## 🔧 Команды для работы

### Docker:
```bash
# Сборка
docker build -t booking-service:latest ./booking-service

# Запуск
docker run -d -p 8080:8080 booking-service:latest

# С feature flag
docker run -d -e ENABLE_FEATURE_X=true -p 8080:8080 booking-service:latest
```

### Helm:
```bash
# Установка (staging)
helm install booking-service ./helm/booking-service -f ./helm/booking-service/values-staging.yaml

# Обновление (production)
helm upgrade booking-service ./helm/booking-service -f ./helm/booking-service/values-prod.yaml

# Удаление
helm uninstall booking-service
```

### CI/CD:
```bash
# Локальный запуск pipeline
gitlab-ci-local build test deploy tag

# Или через Makefile
make ci
```

## 🎯 Достигнутые цели

1. **Ускорение доставки фич**: Автоматизированный CI/CD pipeline
2. **Уменьшение ошибок**: Автоматическое тестирование на каждом этапе
3. **Упрощение масштабирования**: Helm charts с параметризацией
4. **Feature flags**: Возможность A/B тестирования
5. **Service Discovery**: DNS-based discovery в Kubernetes

## 📝 Заключение

Реализована полная автоматизация развёртывания и тестирования микросервисов Hotelio:
- Docker образы оптимизированы по размеру (15MB vs 300MB)
- Helm charts позволяют легко управлять конфигурацией для разных окружений
- CI/CD pipeline автоматизирует весь процесс от сборки до деплоя
- Feature flags позволяют безопасно тестировать новые функции
- Service Discovery через DNS упрощает межсервисное взаимодействие

Система готова к использованию в production с минимальными доработками (подключение к реальному registry и Kubernetes кластеру).