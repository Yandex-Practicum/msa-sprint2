#!/bin/bash
set -e

echo "▶️ Testing fallback route (v1 down -> v2)"

echo
echo "1) Исходное состояние подов:"
kubectl get pods -l app=booking-service

echo
echo "2) Гасим поды v1 (replicas=0):"
kubectl scale deployment booking-service-v1 --replicas=0
echo "   Ждём, пока Envoy уберёт эндпоинты v1 из пула..."
sleep 20

echo
echo "3) Поднимаем под-клиент curl-test..."
kubectl delete pod curl-test --ignore-not-found=true --force --grace-period=0 >/dev/null 2>&1 || true
kubectl run curl-test --image=curlimages/curl --restart=Never --command -- /bin/sh -c "sleep 3600"
kubectl wait --for=condition=Ready pod/curl-test --timeout=120s
sleep 8

echo
echo "4) Запрос по fallback-маршруту (destination без subset, X-Fallback: true):"
kubectl exec curl-test -- curl -s -H "X-Fallback: true" http://booking-service/version
echo
echo "   Ожидание: ответ от v2 (v1 погашен, остались только v2)."

echo
echo "5) Для сравнения - обычный канареечный маршрут при погашенном v1:"
kubectl exec curl-test -- curl -s --max-time 8 http://booking-service/version || echo "(no healthy upstream - 90% трафика адресованы в пустой subset v1)"

echo
echo "6) Возвращаем v1:"
kubectl scale deployment booking-service-v1 --replicas=1
kubectl rollout status deployment/booking-service-v1 --timeout=120s

kubectl delete pod curl-test --force --grace-period=0 >/dev/null 2>&1 || true
