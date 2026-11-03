#!/bin/bash

set -e

URL="${URL:-http://localhost:9090/ping}"
REQUESTS="${REQUESTS:-20}"

echo "▶️ Testing fallback route..."
echo "Гасим v1: kubectl scale deployment/booking-service-v1 --replicas=0"
kubectl scale deployment/booking-service-v1 --replicas=0
kubectl wait --for=delete pod -l app=booking-service,version=v1 --timeout=60s || true
# Даём Envoy получить обновлённый список эндпоинтов
sleep 5

ok=0; v2=0
for i in $(seq 1 "$REQUESTS"); do
    response=$(curl -s -D - "$URL" | tr -d '\r')
    status=$(echo "$response" | head -1 | awk '{print $2}')
    version=$(echo "$response" | awk -F': ' 'tolower($1)=="x-app-version" {print $2}')
    [ "$status" = "200" ] && ok=$((ok + 1))
    [ "$version" = "v2" ] && v2=$((v2 + 1))
done
echo "Ответов 200: $ok из $REQUESTS, из них от v2: $v2"

echo "Возвращаем v1: kubectl scale deployment/booking-service-v1 --replicas=2"
kubectl scale deployment/booking-service-v1 --replicas=2
kubectl rollout status deployment/booking-service-v1 --timeout=120s

if [ "$ok" -eq "$REQUESTS" ] && [ "$v2" -eq "$REQUESTS" ]; then
    echo "✅ Fallback route working: при недоступной v1 весь трафик обслужила v2"
else
    echo "❌ Fallback не сработал"
    exit 1
fi
