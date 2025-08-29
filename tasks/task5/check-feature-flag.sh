#!/bin/bash

set -e

echo "Checking Feature Flag (X-Feature-Enabled: true)..."

# Отправляем запрос с заголовком, чтобы маршрутизировать трафик на v2
kubectl run test-feature-flag --image=curlimages/curl --rm -it --restart=Never -- curl -s --max-time 5 -H "X-Feature-Enabled: true" http://booking-service/ping
