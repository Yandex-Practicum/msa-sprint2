#!/bin/bash

set -e

echo "▶️ Проверка установки Istio..."
kubectl get pods -n istio-system

echo "▶️ Проверка Istio инъекции в default namespace..."
kubectl get namespace default -o json | jq '.metadata.labels."istio-injection"'

echo "▶️ Sidecar в подах booking-service (READY 2/2):"
kubectl get pods -l app=booking-service
