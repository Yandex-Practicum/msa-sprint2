# Report — Task 5. Настройка управления трафиком с Istio

## Что сделано
- Две версии сервиса (v1/v2) через Helm (`values-v1.yaml`, `values-v2.yaml`), метка `version`.
- Istio-маршрутизация:
    - Canary: 90% в v1, 10% в v2.
    - Retry + OutlierDetection (Circuit Breaking).
    - Feature flag: при `x-feature-enabled: true` весь трафик на v2.
- EnvoyFilter: из cookie `Feature-Enabled=true` ставит заголовок `x-feature-enabled: true`.

## Файлы
- `values-v1.yaml`, `values-v2.yaml` — конфиги Helm.
- `virtual-service.yaml`, `destination-rule.yaml` — Istio.
- `envoy-filter.yaml` — фича-флаг через Envoy.
- Логи запусков — в `5.1-4*.txt`.
