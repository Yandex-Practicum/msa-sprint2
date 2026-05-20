#!/bin/bash
set -e

echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true)..."

echo ""
echo "Без заголовка (ожидается 404 на v1):"
kubectl exec deploy/booking-service-v1 -c booking-service -- wget -qO- http://booking-service/feature 2>&1 || echo "404 (expected)"

echo ""
echo "С заголовком X-Feature-Enabled: true (ожидается Feature X is enabled on v2!):"
kubectl exec deploy/booking-service-v1 -c booking-service -- wget -qO- --header='X-Feature-Enabled: true' http://booking-service/feature 2>&1

echo ""
echo "Проверка /ping с заголовком (ожидается x-version: v2):"
kubectl exec deploy/booking-service-v1 -c booking-service -- wget -qO- -S --header='X-Feature-Enabled: true' http://booking-service/ping 2>&1 | grep -i "x-version"