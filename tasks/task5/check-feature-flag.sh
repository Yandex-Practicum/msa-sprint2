#!/bin/bash

set -e

BASE_URL="${INGRESS_URL:-http://localhost:9090}"

echo "Проверка Feature Flag (X-Feature-Enabled: true)..."
echo ""

echo "Request WITHOUT feature flag (should go to v1 or v2 by weight):"
curl -s "$BASE_URL/ping"
echo ""

echo ""
echo "Request WITH X-Feature-Enabled: true (should always go to v2):"
resp=$(curl -s -H "X-Feature-Enabled: true" "$BASE_URL/ping")
echo "$resp"
echo ""

if echo "$resp" | grep -q "v2"; then
    echo "Feature flag routing works: request routed to v2"
else
    echo "Response does not contain 'v2' — check Istio VirtualService config"
fi
