#!/bin/bash
set -e

echo "▶️ Проверка установки Istio..."
kubectl get pods -n istio-system

echo
echo "▶️ Проверка Istio инъекции в default namespace..."
kubectl get namespace default -o jsonpath='{.metadata.labels.istio-injection}' 2>/dev/null || kubectl get namespace default -o json | grep istio-injection
echo

echo "▶️ Поды booking-service (2/2 = приложение + sidecar Envoy)..."
kubectl get pods -l app=booking-service
