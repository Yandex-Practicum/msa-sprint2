#!/bin/bash
set -e

echo "▶️ Поднимаем под-клиент curl-test (с sidecar Envoy, чтобы VirtualService применялся)..."
kubectl delete pod curl-test --ignore-not-found=true --force --grace-period=0 >/dev/null 2>&1 || true
kubectl run curl-test --image=curlimages/curl --restart=Never --command -- /bin/sh -c "sleep 3600"
kubectl wait --for=condition=Ready pod/curl-test --timeout=120s
sleep 8   # дать sidecar-у Envoy время получить конфигурацию

echo
echo "▶️ Checking canary release (90% v1, 10% v2)"
echo "   Отправляем 100 запросов из пода curl-test через sidecar Envoy."
echo

rm -f /tmp/canary-raw.txt
kubectl exec curl-test -- sh -c \
  'for i in $(seq 1 100); do curl -s http://booking-service/version; echo; done' \
  > /tmp/canary-raw.txt

total=$(grep -c '"version"' /tmp/canary-raw.txt || true)
v1=$(grep -o '"version":"v1"' /tmp/canary-raw.txt | wc -l)
v2=$(grep -o '"version":"v2"' /tmp/canary-raw.txt | wc -l)
errors=$((total - v1 - v2))

echo "  всего ответов: $total"
echo "  v1:            $v1"
echo "  v2:            $v2"
echo "  ошибок:        $errors"
echo
echo "Ожидание: v1 ~= 90, v2 ~= 10. Отклонение нормально - weighted routing"
echo "вероятностный, выборка из 100 запросов небольшая."

kubectl delete pod curl-test --force --grace-period=0 >/dev/null 2>&1 || true
