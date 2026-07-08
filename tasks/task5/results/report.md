# Task 5: Настройка управления трафиком с Istio

## Описание

Настроена маршрутизация трафика с помощью Istio Service Mesh для микросервиса `booking-service` с поддержкой Canary развёртывания, Circuit Breaking, Retry и фича-флагов.

## Реализовано

### 1. Istio установлена и настроена
- **Версия**: 1.20.0
- **Профиль**: demo
- **Namespace**: istio-system
- **Компоненты**: Istiod, IngressGateway, EgressGateway, Prometheus, Kiali, Jaeger
- **Auto-injection**: включена в default namespace

### 2. Две версии сервиса (v1 и v2)
- **v1** (основная):
  - Реплики: 2
  - `APP_VERSION=v1`
  - `FEATURE_FLAGS_ENABLED=false`
  
- **v2** (с фича-флагами):
  - Реплики: 1
  - `APP_VERSION=v2`
  - `FEATURE_FLAGS_ENABLED=true`

### 3. VirtualService (маршрутизация трафика)

**Маршрут 1: Canary Release (без фича-флага)**
- 90% трафика → v1
- 10% трафика → v2
- Retries: 3 попытки, timeout 2s

**Маршрут 2: Фича-флаги (X-Feature-Enabled: true)**
- 100% трафика → v2
- Retries: 3 попытки, timeout 2s

**Маршрут 3: Fallback (при ошибках)**
- Если ошибка → перенаправить на v2
- Retries: 2 попытки, timeout 1s

### 4. DestinationRule (управление подключением и обнаружение ошибок)

**Connection Pool:**
- TCP: max 100 соединений
- HTTP/1.1: max 100 pending requests
- HTTP/2: max 1000 одновременных запросов
- Max 2 запроса на соединение

**Outlier Detection (Circuit Breaking):**
- Изоляция пода при 5 ошибках 5xx подряд
- Интервал проверки: 30 сек
- Время изоляции: 30 сек
- Макс 50% подов могут быть изолированы одновременно

### 5. EnvoyFilter (фича-флаги и логирование)
- Логирование заголовка `X-Feature-Enabled` в Envoy sidecar
- Отладочные логи для отслеживания фича-флагов

## Структура файлов результатов

```
task5/results/
├── report.md                  # Описание изменений и решений
├── values-v1.yaml            # Конфиг для развертывания v1
├── values-v2.yaml            # Конфиг для развертывания v2
├── virtualservice.yaml        # Маршрутизация (Canary + Fallback + FeatureFlag)
├── destinationrule.yaml       # Circuit Breaking + Retry
├── envoyfilter.yaml          # Feature flag через EnvoyFilter и логирование
└── check-*.sh                # Проверочные скрипты
```
