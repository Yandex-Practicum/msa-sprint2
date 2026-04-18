#!/bin/bash
set -e

echo "▶️ Testing fallback route..."

kubectl scale deployment booking-service --replicas=0 >/dev/null
sleep 5

echo "▶️ Switching route to v2..."
kubectl apply -f results/virtual-service-fallback.yaml >/dev/null
sleep 3

echo "▶️ Fallback request:"
kubectl run curl-fallback \
  --restart=Never \
  --image=busybox \
  -- sh -c 'wget -qO- http://booking-service/ping'

kubectl wait --for=condition=Ready pod/curl-fallback --timeout=30s >/dev/null 2>&1 || true
kubectl logs curl-fallback
kubectl delete pod curl-fallback --ignore-not-found >/dev/null 2>&1 || true

echo
echo "▶️ Restoring main route and v1..."
kubectl apply -f results/virtual-service.yaml >/dev/null
kubectl scale deployment booking-service --replicas=1 >/dev/null
