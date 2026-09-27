#!/bin/bash

set -e

NAMESPACE=default
CLIENT_POD=booking-test-client
URL="http://booking-service.default.svc.cluster.local:8080/ping"

ensure_client() {
  if ! kubectl get pod "$CLIENT_POD" -n "$NAMESPACE" >/dev/null 2>&1; then
    echo "▶️ Creating in-mesh test client pod ($CLIENT_POD)..."
    kubectl run "$CLIENT_POD" -n "$NAMESPACE" --image=curlimages/curl --restart=Never --command -- sh -c "sleep infinity"
  fi
  kubectl wait --for=condition=Ready "pod/$CLIENT_POD" -n "$NAMESPACE" --timeout=30s
}

ensure_client

echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true)..."

out=$(kubectl exec -n "$NAMESPACE" "$CLIENT_POD" -- curl -s -D - -H "X-Feature-Enabled: true" "$URL")
echo "$out"

if echo "$out" | grep -qi "X-App-Version: v2"; then
  echo "✅ Feature flag routing works: request landed on v2"
else
  echo "❌ Feature flag routing did not route to v2 as expected"
  exit 1
fi
