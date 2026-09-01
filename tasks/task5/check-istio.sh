#!/bin/bash

set -e

echo "▶️ Проверка установки Istio..."
kubectl get pods -n istio-system

echo "▶️ Поды booking-service (если READY 2/2 , то есть sidecar Envoy):"
kubectl get pods -l app=booking-service

echo
echo "▶️ Проверка Istio инъекции в default namespace..."
kubectl get namespace default -o json | jq '.metadata.labels."istio-injection"'