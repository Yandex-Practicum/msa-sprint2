## Внесенные изменения

### helm чарт
- в templates добавлено поле "version: {{ .Values.versionLabel }}"
- новые values конфиги для v1 и v2

### istio конфиги
- _virtual-service.yaml_: fallback для двух версий сервисов, feature flag через http headers, canary с балансом 90/10 v1/v2
- _destination-rule.yaml_: retry, circuit breaking policy
- _envoy-filter.yaml_: envoy filter