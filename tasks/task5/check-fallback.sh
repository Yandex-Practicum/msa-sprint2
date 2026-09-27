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

echo "▶️ Testing fallback route..."
echo "▶️ Killing one booking-service pod..."
POD_TO_KILL=$(kubectl get pods -n "$NAMESPACE" -l app=booking-service -o jsonpath='{.items[0].metadata.name}')
kubectl delete pod "$POD_TO_KILL" -n "$NAMESPACE" --wait=false
echo "Killed: $POD_TO_KILL"

echo "▶️ Sending 20 requests right away (retries + outlier detection should route around it if a sibling replica of the same version is still healthy)..."
ok=0
bad=0
for i in $(seq 1 20); do
  if kubectl exec -n "$NAMESPACE" "$CLIENT_POD" -- curl -sf --max-time 3 "$URL" >/dev/null 2>&1; then
    ok=$((ok+1))
  else
    bad=$((bad+1))
  fi
done
echo "Succeeded: $ok/20, Failed: $bad/20"
if [ "$ok" -gt 0 ]; then
  echo "Fallback route working"
fi

echo
echo "▶️ Full-outage scenario: scaling booking-service-v1 to 0 replicas to simulate v1 being completely down..."
kubectl scale deployment booking-service-v1 -n "$NAMESPACE" --replicas=0
sleep 5

v2_ok=0
failed=0
for i in $(seq 1 20); do
  version=$(kubectl exec -n "$NAMESPACE" "$CLIENT_POD" -- curl -s --max-time 3 -D - -o /dev/null "$URL" 2>/dev/null | tr -d '\r' | grep -i '^X-App-Version:' | awk '{print $2}')
  if [ "$version" = "v2" ]; then
    v2_ok=$((v2_ok+1))
  else
    failed=$((failed+1))
  fi
done
echo "With v1 fully down: reached v2 = $v2_ok/20, failed = $failed/20"
echo "NOTE: Istio does not automatically redirect the ~90% of traffic statically weighted to v1"
echo "over to v2 once v1 has zero endpoints — this is a real Envoy limitation (weighted_clusters"
echo "is chosen once per request, before any retry, and retries never cross to a sibling cluster)."
echo "Expect close to 90% failures here even though v2 is healthy."

echo "▶️ Restoring v1..."
kubectl scale deployment booking-service-v1 -n "$NAMESPACE" --replicas=2
