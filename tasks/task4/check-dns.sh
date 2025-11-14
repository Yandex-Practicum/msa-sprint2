#!/bin/bash
set -e

NAMESPACE="staging"
SERVICE_NAME="booking-service"

echo "▶️ Running in-cluster DNS test..."
echo "⏳ Waiting for pods of $SERVICE_NAME to be ready in namespace $NAMESPACE..."

# Проверяем наличие подов с нужным лейблом
PODS=$(kubectl get pods -n $NAMESPACE -l "app=$SERVICE_NAME" -o name)

if [ -z "$PODS" ]; then
  echo "❌ No pods found for app=$SERVICE_NAME"
  echo "ℹ️ Existing pods:"
  kubectl get pods -n $NAMESPACE --show-labels
  exit 1
fi

# Ожидаем готовность подов
kubectl wait --for=condition=ready pod -n $NAMESPACE -l "app=$SERVICE_NAME" --timeout=60s || {
  echo "❌ $SERVICE_NAME pods are not ready"
  exit 1
}

echo "🚀 Pods are ready! Running DNS test..."

# Запускаем временный pod для теста DNS и HTTP
kubectl run dns-test --rm -i --tty \
  --image=curlimages/curl \
  --restart=Never \
  -n staging \
  -- curl -s http://booking-service-booking-service:80/ping
