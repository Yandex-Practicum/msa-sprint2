#!/bin/bash
set -e
echo "▶️ Testing fallback route..."

# Удаляем все поды v1
kubectl delete pod -l app=booking-service,version=v1 --wait=false --grace-period=0

sleep 10

# Делаем запрос — должен работать через v2
kubectl run fallback-test --image=curlimages/curl --restart=Never --quiet --rm -it -- \
    curl -s http://booking-service/ping

echo "✅ Fallback test passed"