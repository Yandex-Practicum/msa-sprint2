#!/bin/bash

set -e

echo "▶️ Testing fallback route..."

kubectl get pod debug-pod > /dev/null 2>&1 || \
  kubectl run debug-pod --image=curlimages/curl --restart=Never -- sleep infinity > /dev/null 2>&1
kubectl wait --for=condition=Ready pod/debug-pod --timeout=30s > /dev/null 2>&1

code=$(kubectl exec debug-pod -- curl -s -o /dev/null -w "%{http_code}" http://booking-service/ping)

if [ "$code" = "200" ]; then
    echo "✅ Fallback route working (HTTP $code)"
else
    echo "❌ Fallback route failed (HTTP $code)"
fi
