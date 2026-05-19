# Отчет о выполнении задания Task 4

## Описание изменений и решений

### 1. Docker-образ сервиса (booking-service)

**Реализовано:**
- Создан `Dockerfile` на базе `golang:1.21-alpine`
- Сервис написан на Go и включает следующие эндпоинты:
    - `/ping` — проверка доступности (возвращает `pong`)
    - `/health` — health check (возвращает `healthy`)
    - `/ready` — readiness probe (возвращает `ready` через 5 секунд после старта)
    - `/feature` — feature flag endpoint (доступен только при `ENABLE_FEATURE_X=true`)

**Особенности:**
- Использован `sync/atomic` для потокобезопасного состояния readiness
- Feature flag управляется через переменную окружения `ENABLE_FEATURE_X`
- Добавлены unit-тесты в `main_test.go` для всех handler'ов

### 2. Helm-чарт

**Реализовано:**
- Чарт `booking-service` с версией `0.1.0`
- `deployment.yaml` — Deployment с:
    - livenessProbe (проверка `/ping`)
    - readinessProbe (проверка `/ready`)
    - Переменные окружения из `values.yaml`
    - Настройка ресурсов (limits/requests)
- `service.yaml` — Service типа ClusterIP (порт 80 → targetPort 8080)

**Конфигурация окружений:**
- `values.yaml` — базовые значения по умолчанию
- `values-staging.yaml` — staging окружение:
    - 1 реплика
    - Feature X включен (`ENABLE_FEATURE_X=true`)
    - Минимальные ресурсы
- `values-prod.yaml` — production окружение:
    - 3 реплики
    - Feature X выключен (`ENABLE_FEATURE_X=false`)
    - Увеличенные ресурсы и таймауты проб

### 3. CI/CD пайплайн (.gitlab-ci.yml)

**Стадии:**
1. **build** — сборка Docker образа, сохранение в tar
2. **test** — unit-тесты и интеграционные тесты
3. **deploy** — загрузка образа в Minikube и установка через Helm
4. **verify** — проверка DNS Service Discovery
5. **tag** — создание git-тега с timestamp (ручной запуск)

**Особенности:**
- Без использования Docker Registry — прямая загрузка образа через `minikube image load`
- Легкое переключение на боевой режим: удалить строку `minikube image load`
- Артефакты передаются между стадиями через `artifacts`
- Запуск: `gitlab-ci-local build test deploy tag`

### 4. Service Discovery через DNS

**Реализовано:**
- Сервис доступен внутри кластера по DNS имени `booking-service`
- Проверка выполняется из отдельного пода (busybox) через скрипт `check-dns.sh`
- Эндпоинт `/ping` успешно отвечает при обращении по DNS имени

**Скрипты проверки:**
- `check-dns.sh` — проверка DNS разрешения и доступности сервиса изнутри кластера
- `check-status.sh` — проверка статуса деплоя, подов и сервисов

### 5. Результаты проверки

| Проверка | Результат |
|----------|-----------|
| `docker build` | ✅ Успешно |
| Unit-тесты | ✅ PASS |
| Интеграционные тесты | ✅ Все эндпоинты отвечают |
| `kubectl get pods` | ✅ Pod Running |
| `kubectl get services` | ✅ Service ClusterIP |
| `curl /ping` | ✅ `pong` |
| `./check-status.sh` | ✅ Все проверки пройдены |
| `./check-dns.sh` | ✅ DNS test succeeded |
| `docker image ls` | ✅ Образ создан |
| `minikube image list` | ✅ Образ загружен |

