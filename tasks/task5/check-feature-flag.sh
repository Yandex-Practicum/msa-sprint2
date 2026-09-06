#!/bin/bash
set -e

echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true маршрутизирует на v2)..."
echo "   Поднимаем под-клиент curl-test..."
kubectl delete pod curl-test --ignore-not-found=true --force --grace-period=0 >/dev/null 2>&1 || true
kubectl run curl-test --image=curlimages/curl --restart=Never --command -- /bin/sh -c "sleep 3600"
kubectl wait --for=condition=Ready pod/curl-test --timeout=120s
sleep 8

echo
echo "--- Без заголовка (канареечный маршрут, обычно v1) ---"
kubectl exec curl-test -- curl -s http://booking-service/version
echo

echo "--- С заголовком X-Feature-Enabled: true (всегда v2) ---"
kubectl exec curl-test -- curl -s -H "X-Feature-Enabled: true" http://booking-service/version
echo

echo "--- То же через EnvoyFilter-маршрут (v2, feature_x=true) ---"
kubectl exec curl-test -- curl -s -H "X-Feature-Enabled: true" http://booking-service/version
echo

echo "--- Функционал фичи /feature есть только у v2 (ENABLE_FEATURE_X=true) ---"
kubectl exec curl-test -- curl -s -H "X-Feature-Enabled: true" http://booking-service/feature
echo

kubectl delete pod curl-test --force --grace-period=0 >/dev/null 2>&1 || true
