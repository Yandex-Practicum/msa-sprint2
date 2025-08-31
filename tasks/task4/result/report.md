# Report

## Helm

В `helm/booking-service/templates/deployment.yaml` добавлено

```yaml
env: 
  - name: ENABLE_FEATURE_X
    value:  "{{ .Values.env.ENABLE_FEATURE_X }}"
```

Значения, беруться из `helm/booking-service/values-prod.yaml` и `helm/booking-service/values-staging.yaml` и вставляются в deployment.yml. Этот флаг включает/отключает эндпоинт

## Gitlab Local
Добавил стадии в  .gitlab-ci.yml