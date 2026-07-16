#!/bin/bash
set -e

echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true)..."

kubectl get pod debug-pod > /dev/null 2>&1 || \
  kubectl run debug-pod --image=curlimages/curl --restart=Never -- sleep infinity > /dev/null 2>&1
kubectl wait --for=condition=Ready pod/debug-pod --timeout=30s > /dev/null 2>&1

response=$(kubectl exec debug-pod -- curl -s -H "X-Feature-Enabled: true" http://booking-service/ping)
echo "Response: $response"

if echo "$response" | grep -q "v2"; then
    echo "✅ Feature flag routing works — request went to v2"
else
    echo "❌ Feature flag routing failed — request did not reach v2"
fi