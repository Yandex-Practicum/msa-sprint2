#!/bin/bash

set -e

echo "Testing fallback route..."

# Сначала тестируем нормальную работу
echo "Testing normal operation:"
kubectl run test-fallback-normal --image=curlimages/curl --rm -it --restart=Never -- curl -s --max-time 5 http://booking-service/ping

echo "Testing fallback (simulating v1 failure):"
# Тестируем fallback - отправляем запрос с заголовком для v2
kubectl run test-fallback-v2 --image=curlimages/curl --rm -it --restart=Never -- curl -s --max-time 5 -H "X-Feature-Enabled: true" http://booking-service/ping
