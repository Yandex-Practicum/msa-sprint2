#!/bin/bash
set -euo pipefail

NS="${KUBECTL_NAMESPACE:-default}"
POD="dns-test-$(date +%s)"

echo "[INFO] Running in-cluster DNS test..."

kubectl run "$POD" --namespace="$NS" --image=busybox:1.36 --restart=Never --command -- sleep 60
kubectl wait --for=condition=Ready "pod/$POD" --namespace="$NS" --timeout=90s

OUT="$(kubectl exec "$POD" --namespace="$NS" -- wget -qO- "http://booking-service/ping")"
kubectl delete pod "$POD" --namespace="$NS" --wait=false >/dev/null 2>&1 || true

echo "[INFO] DNS Response: ${OUT}"

if [[ "${OUT}" == "pong" ]]; then
  echo "[PASS] DNS test succeeded"
  exit 0
fi

echo "[FAIL] DNS test failed (expected pong)"
exit 1
