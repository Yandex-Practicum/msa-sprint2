#!/bin/bash

set -e

BASE_URL="${INGRESS_URL:-http://localhost:9090}"

echo "Testing fallback route (v1 down -> traffic shifts to v2)..."
echo ""
echo "Step 1: Scaling down v1 to 0 replicas..."
kubectl scale deployment booking-service-v1 --replicas=0
echo "Waiting for v1 pods to terminate..."
sleep 5

echo ""
echo "Step 2: Sending 10 requests (should all go to v2)..."
success=0
for i in $(seq 1 10); do
    resp=$(curl -s --max-time 3 "$BASE_URL/ping" || echo "error")
    echo "  Request $i: $resp"
    if echo "$resp" | grep -qv "error"; then
        ((success++)) || true
    fi
done

echo ""
echo "Successful responses: $success/10"

echo ""
echo "Step 3: Restoring v1..."
kubectl scale deployment booking-service-v1 --replicas=1
echo "v1 restored."
