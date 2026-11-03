# Задание 5. Управление трафиком с Istio

## Что сделано

Задание 4 скопировано в task5 (сервис, Helm-чарт, пайплайн). Istio 1.22.3 установлен в Minikube: `istioctl install --set profile=demo`. Для namespace `default` включена автоматическая инъекция sidecar: `kubectl label namespace default istio-injection=enabled`. Все поды сервиса — `2/2`: контейнер сервиса и Envoy.

### Две версии сервиса — [values-v1.yaml](values-v1.yaml), [values-v2.yaml](values-v2.yaml)
Один образ `booking-service`, разные конфигурации, два Helm-релиза одного чарта.

| | v1 | v2 |
| :- | :- | :- |
| Релиз | `booking-service-v1` | `booking-service-v2` |
| Метки | `app: booking-service`, `version: v1` | `app: booking-service`, `version: v2` |
| Реплики | 2 | 1 |
| `ENABLE_FEATURE_X` | false | true (`/feature` работает) |
| Service | создаёт общий `booking-service` | не создаёт |

Доработки чарта:
- `appName` — общая метка `app` для обеих версий;
- `version` — метка `version` и переменная `APP_VERSION`. Сервис отдаёт её в заголовке `X-App-Version`, так скрипты видят, какая версия ответила;
- `service.enabled` — Service один на все версии, а версию выбирает Istio.

```bash
helm upgrade --install booking-service-v1 helm/booking-service -f results/values-v1.yaml
helm upgrade --install booking-service-v2 helm/booking-service -f results/values-v2.yaml
kubectl apply -f results/destination-rule.yaml -f results/virtual-service.yaml -f results/envoy-filter.yaml
kubectl port-forward -n istio-system svc/istio-ingressgateway 9090:80
```

### Маршрутизация — [virtual-service.yaml](virtual-service.yaml)
Трафик входит через Istio ingress gateway (`Gateway booking-gateway`). Через `kubectl port-forward svc/booking-service` маршрутизация Istio не работала бы: port-forward ведёт прямо в под, мимо Envoy.

Правила по порядку:
1. **Фича-флаг.** Запросы с внутренним заголовком `x-booking-route: v2` идут в subset `v2`. Этот заголовок выставляет EnvoyFilter, см. ниже.
2. **Канарейка 90/10.** 90% — в `v1-with-fallback`, 10% — в `v2`. Таймаут 5 с, до 3 повторов на `5xx`, `connect-failure`, `refused-stream`, `reset`, `gateway-error`. Каждая попытка ограничена 2 с.

**Fallback v1 → v2.** Штатно VirtualService не умеет переключаться между subset'ами: повторы идут в тот же subset. Поэтому fallback сделан на приоритетах эндпоинтов Envoy.
- Subset `v1-with-fallback` в DestinationRule включает все поды сервиса, но с `failoverPriority: ["version=v1"]`.
- Поды v1 получают высший приоритет, поды v2 — следующий.
- Пока v1 здорова, весь трафик этой доли идёт только в v1. Это подтверждает канарейка: v2 получила 11%, а не около 40%, как было бы при равномерной балансировке по трём подам.
- Если поды v1 недоступны или выброшены `outlierDetection` после трёх ошибок 5xx подряд, Envoy переводит трафик на поды v2.

### Retry и Circuit Breaking — [destination-rule.yaml](destination-rule.yaml)
- **Subsets:** `v1`, `v2`, `v1-with-fallback`.
- **Circuit breaking (`connectionPool`):**
  - до 100 TCP-соединений, таймаут соединения 1 с;
  - до 50 запросов в очереди;
  - до 10 запросов на соединение.
- **`connectionPool.http.maxRetries: 3`** — не больше 3 одновременных повторов. Сами повторы задаются в VirtualService: у DestinationRule нет поля для политики повторов. Ограничение нужно, чтобы повторы не превратились в шквал.
- **`outlierDetection`:** после 3 ошибок 5xx подряд под исключается из балансировки на 30 с. Можно исключить до 100% подов. Это же запускает переключение на v2.

### Фича-флаг через EnvoyFilter — [envoy-filter.yaml](envoy-filter.yaml)
Lua-фильтр на ingress gateway:
- если в запросе `X-Feature-Enabled: true` (регистр значения не важен), выставляет внутренний заголовок `x-booking-route: v2`;
- пришедший от клиента `x-booking-route` всегда удаляет. Попасть в v2 можно только через фича-флаг, подделать маршрут нельзя.

VirtualService маршрутизирует по внутреннему заголовку. Правило разбора флага живёт в одном месте, на входе в mesh.

## Проверочные скрипты
Скрипты доработаны. Теперь они считают, какая версия ответила (по `X-App-Version`), и завершаются с ошибкой, если результат неверный. В `check-istio.sh` `jq` заменён на `kubectl -o jsonpath`: `jq` установлен не везде.

| Скрипт | Результат | Лог |
| :- | :- | :- |
| `check-istio.sh` | Поды Istio Running, `istio-injection: enabled`, поды сервиса 2/2 | [check-istio.log](check-istio.log) |
| `check-canary.sh` | 100 запросов: v1 — 89, v2 — 11, ошибок 0 | [check-canary.log](check-canary.log) |
| `check-feature-flag.sh` | С `X-Feature-Enabled: true` — 20 из 20 в v2, `/feature` отвечает. Без заголовка — 3 из 20. С подделанным `x-booking-route` — 1 из 20 | [check-feature-flag.log](check-feature-flag.log) |
| `check-fallback.sh` | v1 погашена (`scale --replicas=0`): 20 из 20 ответов 200, все от v2. Потом v1 возвращается | [check-fallback.log](check-fallback.log) |

`istioctl analyze`: `No validation issues found when analyzing namespace: default`.

Порт 9090 на хосте занят gRPC-портом `booking-service` из задания 2. На время проверок стеки заданий 2 и 3 остановлены (`docker compose stop`).
