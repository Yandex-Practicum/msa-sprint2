# Отчет о выполнении Task 4 - Автоматизация развертывания и тестирования

## Описание изменений и решений

### 1. Docker-образ сервиса

**Файл**: `booking-service/Dockerfile`

**Реализовано**:
- Многоэтапная сборка с использованием golang:1.21-alpine для компиляции
- Финальный образ на базе alpine:latest с curl для healthcheck
- HEALTHCHECK endpoint по /health
- EXPOSE порт 8080
- Оптимизированный размер образа

**Особенности**:
- Использование multi-stage build для уменьшения размера
- Добавление curl для выполнения healthcheck
- Правильная настройка рабочей директории

### 2. Go сервис

**Файл**: `booking-service/main.go`

**Реализовано**:
- `/ping` endpoint для liveness probe
- `/health` endpoint для healthcheck
- `/ready` endpoint для readiness probe с задержкой 5 секунд
- Фича-флаг ENABLE_FEATURE_X для условного включения /feature endpoint
- Логирование времени запуска сервера

**Endpoints**:
- `GET /ping` - возвращает "pong" для проверки доступности
- `GET /health` - возвращает "healthy" для healthcheck
- `GET /ready` - возвращает "ready" после 5 секунд работы
- `GET /feature` - доступен только при ENABLE_FEATURE_X=true

### 3. Helm чарт

**Структура**:
- `helm/booking-service/Chart.yaml` - метаданные чарта
- `helm/booking-service/values.yaml` - значения по умолчанию
- `helm/booking-service/values-staging.yaml` - конфигурация для staging
- `helm/booking-service/values-prod.yaml` - конфигурация для production
- `helm/booking-service/templates/deployment.yaml` - шаблон развертывания
- `helm/booking-service/templates/service.yaml` - шаблон сервиса

**Deployment**:
- Настраиваемое количество реплик через replicaCount
- Liveness probe по /ping с настраиваемыми параметрами
- Readiness probe по /ready с настраиваемыми параметрами
- Переменные окружения из values.yaml
- Ресурсы (CPU, память) с requests и limits
- imagePullPolicy: Never для локальных образов

**Service**:
- Тип ClusterIP
- Порт 80 -> targetPort 8080
- Селектор по меткам приложения

### 4. CI/CD пайплайн

**Файл**: `.gitlab-ci.yml`

**Стадии**:
1. **build** - сборка Docker образа
2. **test** - тестирование контейнера (запуск, проверка /ping, очистка)
3. **deploy** - загрузка образа в Minikube и развертывание через Helm
4. **tag** - создание git тега с временной меткой

**Особенности**:
- Использование gitlab-ci-local для локального тестирования
- Автоматическая загрузка образа в Minikube
- Helm upgrade --install для развертывания
- Автоматическое создание тегов

### 5. Service Discovery через DNS

**Реализация**:
- Скрипт `check-dns.sh` для тестирования DNS внутри кластера
- Создание временного пода для проверки доступности сервиса
- Проверка HTTP запроса к http://booking-service/ping
- Автоматическая очистка тестовых ресурсов

**Проверка**:
- DNS имя booking-service доступно внутри кластера
- HTTP запросы к сервису работают корректно
- Service Discovery функционирует как ожидается

## Технические детали

### Переменные окружения
- `ENABLE_FEATURE_X` - управляет доступностью /feature endpoint
- Настраивается через values.yaml для разных окружений

### Пробы Kubernetes
- **Liveness Probe**: /ping каждые 30 секунд, задержка 10 секунд
- **Readiness Probe**: /ready каждые 10 секунд, задержка 5 секунд
- **Healthcheck**: Docker healthcheck по /health каждые 30 секунд

### Ресурсы
- **Staging**: 64Mi-128Mi RAM, 250m-500m CPU
- **Production**: 128Mi-256Mi RAM, 500m-1000m CPU

## Результаты тестирования

### Docker образ
- Успешно собирается через `docker build`
- Healthcheck работает корректно
- Размер оптимизирован через multi-stage build

### Kubernetes развертывание
- Pod успешно запускается и переходит в состояние Running
- Service создается с типом ClusterIP
- Пробы работают корректно

### CI/CD пайплайн
- Стадия build проходит успешно
- Стадия test проходит успешно
- Локальное тестирование через gitlab-ci-local работает

### Service Discovery
- DNS имя booking-service доступно внутри кластера
- HTTP запросы к сервису работают
- Скрипт check-dns.sh выполняется успешно

## Выводы

Система автоматизации развертывания и тестирования успешно реализована:

1. **Docker образ** - оптимизирован, содержит все необходимые endpoints
2. **Helm чарт** - полностью настроен с пробами и ресурсами
3. **CI/CD пайплайн** - автоматизирует сборку, тестирование и развертывание
4. **Service Discovery** - работает через DNS внутри кластера
5. **Фича-флаги** - реализованы через переменные окружения

Система готова к использованию в staging и production окружениях с возможностью легкого масштабирования и управления конфигурацией.
