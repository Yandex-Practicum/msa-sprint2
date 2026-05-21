# Task 5 — Istio Service Mesh

## Что сделано

### 1. Установлен Istio
- Профиль `demo`, инъекция sidecar в `default` namespace
- Поды получают Envoy-прокси автоматически (2/2 Ready)

### 2. Две версии сервиса
- **v1** — основная (2 реплики), заголовок `X-Version: v1`
- **v2** — новая (1 реплика), заголовок `X-Version: v2`, фича-флаг через `X-Feature-Enabled: true`

### 3. Канареечный Release 90/10
- `VirtualService` делит трафик: 90% v1, 10% v2
- Retry: 5 попыток при ошибках

### 4. Фича-флаг
- Заголовок `X-Feature-Enabled: true` → маршрут на v2
- `EnvoyFilter` с Lua добавляет мета-заголовки

### 5. Circuit Breaking и Retry
- `DestinationRule`: connection pool, outlier detection
- `VirtualService`: retry при `5xx, connect-failure, refused-stream, reset`

### 6. Fallback
- При падении v1 трафик уходит на v2 через retry

## Результаты проверок

| Проверка | Результат |
|----------|-----------|
| Istio pods (istio-system) | ✅ 3/3 Running |
| Инъекция sidecar | ✅ enabled |
| Канареечный 90/10 | ✅ v1 ~90, v2 ~10 |
| Feature flag | ✅ X-Feature-Enabled → v2 |
| Circuit Breaking | ✅ Настроено |
| Fallback | ⚠️ Частично |

## Файлы

- `istio/virtual-service.yaml` — маршрутизация
- `istio/destination-rule.yaml` — subsets, circuit breaker
- `istio/envoy-filter.yaml` — Lua-фильтр
- `check-istio.sh`, `check-canary.sh`, `check-feature-flag.sh`, `check-fallback.sh` — тесты