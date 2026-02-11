#!/bin/bash

set -e

BASE_URL="${INGRESS_URL:-http://localhost:9090}"

echo "Checking canary release (90% v1, 10% v2)..."
echo "Sending 100 requests to $BASE_URL/ping..."

v1=0
v2=0
errors=0
total=100

for i in $(seq 1 $total); do
    resp=$(curl -s --max-time 3 "$BASE_URL/ping" || echo "error")
    if echo "$resp" | grep -q "v2"; then
        ((v2++)) || true
    elif echo "$resp" | grep -q "error\|curl"; then
        ((errors++)) || true
    else
        ((v1++)) || true
    fi
done

echo ""
echo "Results:"
echo "  v1: $v1/$total ($(( v1 * 100 / total ))%)"
echo "  v2: $v2/$total ($(( v2 * 100 / total ))%)"
echo "  errors: $errors/$total"
echo ""
echo "Expected: ~90% v1, ~10% v2"
