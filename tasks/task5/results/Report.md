1. Для определения canary в сервис была внесена ENV: VERSION
2. Был установлен istio
3. В istio/deployments.yaml реализованы две версии, для v1 - две реплики, для v2 - одна реплика с фичей
4. Настроены Canary Release, Fallback + retries, Circuit Breaker
5. Реализована маршрутизация к v2 через EnvoyFilter
6. Проведены тесты с помощью скриптов