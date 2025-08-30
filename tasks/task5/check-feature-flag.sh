#!/bin/bash

set -e

echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true)..."

# Отправляем запрос с заголовком, чтобы маршрутизировать трафик на `v2`
kubectl run feature-routing-test --rm -it \
  --image=curlimages/curl \
  --restart=Never \
  -- curl -s -H "X-Feature-Enabled: true" http://booking-service/feature
