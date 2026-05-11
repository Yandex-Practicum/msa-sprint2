CI/CD и деплой в Kubernetes

## Что сделано

### 1. Docker-образ
- Собран образ `booking-service` на Node.js
- Добавлены HTTP эндпоинты: `/ping`, `/health`, `/ready`
- Добавлен фича-флаг `/feature` (включается переменной `ENABLE_FEATURE_X=true`)

### 2. Helm-чарт
- Deployment с `livenessProbe` и `readinessProbe` по `/health` и `/ready`
- Service типа ClusterIP (порт 80 → 8080)
- Созданы `values.yaml` для staging и prod

### 3. CI/CD
- `build` — сборка Docker образа
- `test` — запуск контейнера, проверка `/ping`
- `deploy` — загрузка образа в Minikube, установка Helm

### 4. Service Discovery
- DNS имя `booking-service` работает внутри кластера

## Результат
Сервис развёрнут в Minikube, доступен по DNS, CI/CD автоматизирован.