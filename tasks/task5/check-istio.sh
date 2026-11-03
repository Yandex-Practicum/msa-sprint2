#!/bin/bash

set -e

echo "▶️ Проверка установки Istio..."
kubectl get pods -n istio-system

echo "▶️ Проверка Istio инъекции в default namespace..."
# jsonpath вместо jq: jq не везде установлен
kubectl get namespace default -o jsonpath='{.metadata.labels.istio-injection}'
echo

echo "▶️ Поды booking-service (2/2 — контейнер сервиса + sidecar Envoy)..."
kubectl get pods -l app=booking-service -L version
