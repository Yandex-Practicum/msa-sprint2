# Task 5 — Istio Traffic Management for booking-service

Итог: установлен Istio (demo), включена автоинъекция, развернуты две версии booking-service (v1/v2) под одним Service, настроены:
- Canary: 90% v1, 10% v2
- Feature flag: заголовок `X-Feature-Enabled: true` → v2
- Retries + Circuit Breaking (DestinationRule)
- Fallback: при ошибках повторная попытка переводится на v2 (см. примечание о 503 ниже)

## Установка Istio
- `istioctl install --set profile=demo -y`
- `kubectl label namespace default istio-injection=enabled --overwrite`

Проверка установки/инъекции:
- `bash tasks/task5/check-istio.sh`

## Деплой сервиса (v1 и v2)
Чарт: `tasks/task5/helm/booking-service`
- v1 (создаёт Service):
  - `helm upgrade --install booking-v1 tasks/task5/helm/booking-service -f tasks/task5/results/values-v1.yaml`
- v2 (без Service):
  - `helm upgrade --install booking-v2 tasks/task5/helm/booking-service -f tasks/task5/results/values-v2.yaml`

Проверка подов и сайдкаров:
- `kubectl get pods -l app=booking-service -L version -o wide`
- при необходимости форсируем инъекцию: аннотация `sidecar.istio.io/inject=true` и `rollout restart`

## Istio-манифесты
Файлы (путь: `tasks/task5/results/`):
- `destination-rule.yaml` — connectionPool + outlierDetection (`consecutive5xxErrors`, `interval`, `baseEjectionTime`)
- `virtual-service.yaml` — Gateway + header‑match на v2 + canary 90/10 + retry‑based fallback
- `envoy-filter.yaml` — демонстрационный Lua‑фильтр (не обязателен для тестов)

Применение:
- `kubectl apply -f tasks/task5/results/destination-rule.yaml`
- `kubectl apply -f tasks/task5/results/virtual-service.yaml`
- `kubectl apply -f tasks/task5/results/envoy-filter.yaml`

Доступ к сервису через IngressGateway:
- `kubectl -n istio-system port-forward svc/istio-ingressgateway 9090:80`
- тестовый URL: `http://localhost:9090`

## Проверки
Скрипты находятся в `tasks/task5/`. Все скрипты рассчитаны на bash.

1) Установка/инъекция:
- `bash tasks/task5/check-istio.sh` → выводит поды Istio и метку `istio-injection: enabled`

2) Canary 90/10 (на /feature):
- `bash tasks/task5/check-canary.sh | tee tasks/task5/results/check-canary.log`
- ожидается около 90% ответов 404 (v1) и 10% 200 (v2)

3) Feature flag (заголовок → v2):
- `bash tasks/task5/check-feature-flag.sh | tee tasks/task5/results/check-feature-flag.log`
- ожидается 200 от v2

4) Fallback (v1 «падает» → трафик на v2):
- `kubectl scale deploy/booking-v1-v1 --replicas=0 && kubectl rollout status deploy/booking-v1-v1`
- `bash tasks/task5/check-fallback.sh | tee tasks/task5/results/check-fallback.log`
- затем вернуть v1: `kubectl scale deploy/booking-v1-v1 --replicas=2 && kubectl rollout status deploy/booking-v1-v1`

## Примечания и нюансы
- 503 при полном отсутствии v1: при `replicas=0` у subset v1 Envoy иногда отвечает `503 no healthy upstream` до ретрая, поэтому «ретрай‑фолбэк» может не сработать стабильно. Два рабочих подхода:
  - Операционный переключатель весов (надёжно для демонстрации):
    - 100% на v2: `kubectl patch virtualservice booking-service --type='json' -p='[{"op":"replace","path":"/spec/http/2/route/0/weight","value":0},{"op":"replace","path":"/spec/http/2/route/1/weight","value":100}]'`
    - вернуть канарейку: `kubectl patch virtualservice booking-service --type='json' -p='[{"op":"replace","path":"/spec/http/2/route/0/weight","value":90},{"op":"replace","path":"/spec/http/2/route/1/weight","value":10}]'`
  - Усилить ретраи в `VirtualService` (может помочь, но не гарантирует): добавить `retriableStatusCodes: [503]` к `retries`.
- Подсети (subsets) определяются по метке `version: v1|v2`. Это обеспечивается шаблоном Deployment в Helm‑чарте (`podLabels.version`).
- Для канарейки и фич‑флага мы используем endpoint `/feature`: v1 отдаёт 404, v2 — 200.

## Структура результата
`tasks/task5/results/`
- `values-v1.yaml`, `values-v2.yaml`
- `destination-rule.yaml`, `virtual-service.yaml`, `envoy-filter.yaml`
- `report.md`
- Логи проверок: `check-istio.log`, `check-canary.log`, `check-fallback.log`, `check-feature-flag.log`

