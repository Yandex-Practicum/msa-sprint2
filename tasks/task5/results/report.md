# Отчёт о выполнении задания №5 — Istio Service Mesh для booking-service

## Добавлен роут `/ping` в booking-service

booking-service — чисто gRPC-сервис, HTTP не было вообще. Проверочные скрипты, приложенные к заданию требовали выполнять команду `curl http://localhost:9090/ping`.

Вместо переписывания всех проверок под `grpcurl` (нужна была бы закачка конкретной версии бинарника в каждый тестовый под, парсинг verbose-вывода) в [tasks/task2/booking-service/src/httpServer.ts](../../task2/booking-service/src/httpServer.ts) добавлен лёгкий HTTP-сервер на отдельном порту (`HTTP_PORT`, по умолчанию 8080): `GET /ping` → `200 pong` с заголовком `X-App-Version` (берётся из `APP_VERSION`). gRPC-логика, health-пробы, БД/Kafka — не тронуты. Это резко упростило все проверки (обычный `curl` вместо gRPC-клиента) и заодно дало простой способ понять, какая версия ответила на конкретный запрос — сам под сообщает об этом в заголовке, без необходимости что-либо внедрять на уровне Istio.

## Две версии сервиса

Один Service (`booking-service`, селектор только `app`, без `version`) стоит перед двумя отдельными деплойментами — `booking-service-v1` (2 реплики, `ENABLE_FEATURE_X=false`) и `booking-service-v2` (1 реплика, `ENABLE_FEATURE_X=true`). Оба — один и тот же образ, различаются только лейблом `version` (для DestinationRule subsets) и парой env-переменных. Реализовано через `{{- range .Values.versions }}` в [templates/deployment.yaml](../helm/booking-service/templates/deployment.yaml) — один шаблон, список версий в values.yaml, а не два дублирующих файла. Подробности конфигурации каждой версии — [values-v1.yaml](values-v1.yaml), [values-v2.yaml](values-v2.yaml) (вырезки из фактического values.yaml, для наглядности).

## Istio-ресурсы

- [destination-rule.yaml](destination-rule.yaml) — subsets `v1`/`v2`, `connectionPool` + `outlierDetection` (Circuit Breaking: под, отдавший подряд несколько ошибок/сбоев соединения, временно исключается из балансировки).
- [virtual-service.yaml](virtual-service.yaml) — canary-разделение 90% v1 / 10% v2 + `retries` (5xx/reset/connect-failure/refused-stream, 3 попытки).
- [envoy-filter.yaml](envoy-filter.yaml) — при заголовке `X-Feature-Enabled: true` трафик безусловно уходит на v2 (патчит route table вызывающих sidecar'ов, вставляя правило перед canary-маршрутом; специально без `workloadSelector`, так как нужно патчить исходящую конфигурацию **вызывающих**, а не самого booking-service).

Все три файла в этой папке — не исходники шаблонов, а **реальный вывод `helm template`** на момент прогона (с уже подставленными значениями), чтобы отчёт показывал именно то, что применяется в кластере.

## Честно зафиксированное ограничение

Istio выбирает, на какую версию (v1 или v2) отправить запрос, один раз — по весам 90/10 — ещё до всех повторных попыток. Если запрос не удался и Envoy делает retry, повтор идёт **туда же**, на ту же версию, а не на другую. Поэтому «убили под v1 → трафик сам переключился на v2» **не работает** просто так.

Retry и outlier detection реально помогают, только если у v1 осталась хотя бы одна живая реплика — повтор попадёт на неё. А если v1 выключен полностью (0 реплик), то ~90% трафика, весом закреплённые за v1, продолжат идти туда же и просто получать ошибку — переключения на v2 не происходит.

Это подтверждается реальным прогоном `check-fallback.sh` ниже: убили один под, но вторая реплика v1 жива — 20/20 запросов прошли успешно. Выключили v1 полностью — только 2 из 20 дошли до v2, остальные 18 упали с ошибкой.

## Реальный прогон проверочных скриптов

Все четыре скрипта выполнены на живом кластере (Minikube + `istioctl install --set profile=demo`, инъекция включена в `default`), полные логи — в [logs/](logs/).

### `check-istio.sh` — [лог](logs/check-istio.log)
Istio control plane (`istiod`, `istio-ingressgateway`, `istio-egressgateway`) в статусе `Running`, инъекция в `default` включена (`"enabled"`).

### `check-canary.sh` — [лог](logs/check-canary.log)
```
v1: 87   v2: 13   unmatched: 0   (то есть прмимерно ~90/~10)
```
100 запросов через тестовый под внутри mesh, распределение близко к заявленным 90/10.

### `check-feature-flag.sh` — [лог](logs/check-feature-flag.log)
Запрос с `X-Feature-Enabled: true` получил `x-app-version: v2` в ответе — `EnvoyFilter` перенаправил трафик на v2 в обход canary-весов.

### `check-fallback.sh` — [лог](logs/check-fallback.log)
- Один под убит (жива вторая реплика v1): **20/20 успешных** запросов — retry + outlier detection отработали.
- v1 масштабирован в 0 (полный даун): **2/20 попали на v2, 18/20 ошибок** — соответствует задокументированному выше ограничению Envoy, а не багу конфигурации.

## Файлы в этой папке

```
task5/results/
├── report.md              # этот файл
├── values-v1.yaml          # эффективная конфигурация v1 (вырезка из values.yaml)
├── values-v2.yaml          # эффективная конфигурация v2 (вырезка из values.yaml)
├── virtual-service.yaml    # canary + retries (helm template, реальный вывод)
├── destination-rule.yaml   # retries + circuit breaking (helm template, реальный вывод)
├── envoy-filter.yaml       # feature flag через EnvoyFilter (helm template, реальный вывод)
└── logs/                   # реальные логи прогонов check-istio/canary/fallback/feature-flag.sh
```
