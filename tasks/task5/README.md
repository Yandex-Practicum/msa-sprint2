# Подготовка окружения

Перед началом убедитесь, что на машине установлены:

Требуемое ПО:
- Docker
- Minikube
- Helm
- istioctl
- Node.js + npm — желательно через nvm
- gitlab-ci-local

# Команды установки (Ubuntu/WSL)

## Установка nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts

## Установка gitlab-ci-local
npm install -g gitlab-ci-local

## Запуск Minikube
minikube start --driver=docker

## Установка Istio
curl -L https://istio.io/downloadIstio | sh -
export PATH="$PWD/istio-*/bin:$PATH"
istioctl install --set profile=demo -y

## Включение sidecar-инъекции в default namespace
kubectl label namespace default istio-injection=enabled --overwrite

# Структура проекта

task5/
├── helm/
│   └── booking-service/          # Helm-чарт: две версии (v1/v2) + Istio-ресурсы
├── .gitlab-ci.yml                # CI/CD пайплайн
├── check-istio.sh                # Проверка установки Istio и инъекции
├── check-canary.sh               # Проверка canary-разделения трафика (90/10)
├── check-fallback.sh             # Проверка fallback-маршрута
├── check-feature-flag.sh         # Проверка роутинга по X-Feature-Enabled
├── check-dns.sh                  # Проверка DNS внутри кластера
├── check-status.sh               # Статус деплоя
├── README.md                     # Этот файл

# Что реализовано

## 1. Сервис

booking-service (`../task2/booking-service/`) — gRPC-сервис (booking.proto + стандартный
gRPC Health Checking Protocol) плюс лёгкий HTTP `/ping` на отдельном порту (`HTTP_PORT`,
по умолчанию 8080) — именно через него проверяется Istio-маршрутизация в этом задании.
Каждый под сообщает свою версию в заголовке ответа `X-App-Version` (берётся из `APP_VERSION`).

## 2. Две версии

- **v1** — основная версия, `ENABLE_FEATURE_X=false`.
- **v2** — версия с включённым фича-флагом, `ENABLE_FEATURE_X=true`.

Обе версии — один и тот же образ, разный `version`-лейбл пода и `ENABLE_FEATURE_X`.
Один Service (`booking-service`, селектор только по `app`) стоит перед обеими версиями.

## 3. Istio-маршрутизация

- **DestinationRule** (`helm/booking-service/templates/destinationrule.yaml`) — subsets
  `v1`/`v2` по лейблу `version`; `connectionPool` + `outlierDetection` (circuit breaking:
  под, отдающий подряд несколько ошибок/сбоев соединения, временно исключается из пула).
- **VirtualService** (`templates/virtualservice.yaml`) — canary-разделение 90% v1 / 10% v2
  плюс `retries` (retry на 5xx/reset/connect-failure/refused-stream).
- **EnvoyFilter** (`templates/envoyfilter.yaml`) — при заголовке `X-Feature-Enabled: true`
  трафик безусловно уходит на v2 (патчит route table вызывающих sidecar'ов, вставляя
  правило перед canary-маршрутом).

**Честное ограничение**: Envoy выбирает cluster из canary-весов один раз при матче
маршрута, до ретраев — ретраи всегда идут в тот же cluster, никогда в соседний.
Поэтому «убили под v1 → трафик автоматически поехал на v2» *не* происходит нативно:
retry+outlier detection спасают, когда жива other реплика той же версии, но не когда
версия полностью down (это видно и явно проговаривается в выводе `check-fallback.sh`).

## 4. CI/CD

Стадии как в task4 (`build`/`test`/`deploy`/`tag`), `deploy` дополнительно проверяет
наличие `istioctl` и namespace `istio-system` перед `helm upgrade --install`.

# Проверка корректности

```bash
./check-istio.sh          # Istio установлен, инъекция включена
./check-canary.sh         # ~90/10 между v1 и v2
./check-fallback.sh       # ретраи/outlier detection + честная демонстрация ограничения
./check-feature-flag.sh   # X-Feature-Enabled: true -> v2
./check-dns.sh            # DNS-имя booking-service резолвится и отвечает
./check-status.sh         # общий статус деплоя
```

# Подсказки

- `imagePullPolicy: Never` нужен для использования локального образа.
- `minikube image load` копирует образ внутрь Minikube.
- `kubectl port-forward` **нельзя** использовать для проверки canary/fallback/feature-flag —
  он идёт в обход Envoy-sidecar вызывающей стороны, поэтому ни один из Istio-маршрутов не
  применится. Все три скрипта поэтому создают тестовый под внутри mesh (`booking-test-client`,
  `curlimages/curl`) и ходят через него.
- Для простых ручных проверок (`check-status.sh`) port-forward по-прежнему годится:
  ```bash
  kubectl port-forward svc/booking-service 8080:8080
  curl http://localhost:8080/ping
  ```
