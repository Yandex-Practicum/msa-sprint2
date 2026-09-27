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

echo "▶️ Checking canary release (90% v1, 10% v2)..."

v1=0
v2=0
other=0
for i in $(seq 1 100); do
  version=$(kubectl exec -n "$NAMESPACE" "$CLIENT_POD" -- curl -s -D - -o /dev/null "$URL" | tr -d '\r' | grep -i '^X-App-Version:' | awk '{print $2}')
  case "$version" in
    v1) v1=$((v1+1));;
    v2) v2=$((v2+1));;
    *) other=$((other+1));;
  esac
done

echo "v1: $v1   v2: $v2   unmatched: $other   (expected ~90/~10)"
