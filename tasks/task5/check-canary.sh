#!/bin/bash

set -e

echo "▶️ Checking canary release (90% v1, 10% v2)..."

kubectl get pod debug-pod > /dev/null 2>&1 || \
  kubectl run debug-pod --image=curlimages/curl --restart=Never -- sleep infinity > /dev/null 2>&1
kubectl wait --for=condition=Ready pod/debug-pod --timeout=30s > /dev/null 2>&1

v1=0
v2=0
for i in $(seq 1 100); do
    response=$(kubectl exec debug-pod -- curl -s http://booking-service/ping 2>/dev/null)
    if echo "$response" | grep -q "v1"; then
        v1=$((v1+1))
    elif echo "$response" | grep -q "v2"; then
        v2=$((v2+1))
    fi
done

echo "v1: $v1 requests"
echo "v2: $v2 requests"