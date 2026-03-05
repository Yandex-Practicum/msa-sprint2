#!/bin/bash

echo "============================================"
echo " Feature Flag Header Check"
echo "============================================"
echo ""

# Part 1: Without header — expect mix of v1 and v2
echo "--- Part 1: 10 requests WITHOUT x-feature-enabled header ---"
V1_NO_HEADER=0
V2_NO_HEADER=0
for i in $(seq 1 10); do
  RESPONSE=$(kubectl run feature-no-$i \
    --rm -i --restart=Never \
    --image=curlimages/curl:8.4.0 \
    --timeout=30s \
    -- curl -s --max-time 5 http://booking-service/ping 2>/dev/null) || RESPONSE="error"
  echo "  [$i] -> $RESPONSE"
  if echo "$RESPONSE" | grep -q "pong-v1"; then
    V1_NO_HEADER=$((V1_NO_HEADER + 1))
  elif echo "$RESPONSE" | grep -q "pong-v2"; then
    V2_NO_HEADER=$((V2_NO_HEADER + 1))
  fi
done
echo "  v1: $V1_NO_HEADER, v2: $V2_NO_HEADER"
echo ""

# Part 2: With header — expect 100% v2
echo "--- Part 2: 10 requests WITH x-feature-enabled: true ---"
ALL_V2=true
for i in $(seq 1 10); do
  RESPONSE=$(kubectl run feature-yes-$i \
    --rm -i --restart=Never \
    --image=curlimages/curl:8.4.0 \
    --timeout=30s \
    -- curl -s --max-time 5 -H "x-feature-enabled: true" http://booking-service/ping 2>/dev/null) || RESPONSE="error"
  echo "  [$i] -> $RESPONSE"
  if ! echo "$RESPONSE" | grep -q "pong-v2"; then
    ALL_V2=false
  fi
done

echo ""
if [ "$ALL_V2" = true ]; then
  echo "[PASS] All requests with x-feature-enabled: true routed to v2"
else
  echo "[FAIL] Some requests with feature flag did not reach v2. Check VirtualService."
fi

# Part 3: Check x-feature-routed response header from EnvoyFilter
echo ""
echo "--- Part 3: Check x-feature-routed response header (EnvoyFilter) ---"
HEADERS=$(kubectl run feature-header-check \
  --rm -i --restart=Never \
  --image=curlimages/curl:8.4.0 \
  --timeout=30s \
  -- curl -s -I --max-time 5 -H "x-feature-enabled: true" http://booking-service/ping 2>/dev/null) || HEADERS=""

echo "$HEADERS"

if echo "$HEADERS" | grep -qi "x-feature-routed"; then
  echo "[PASS] x-feature-routed header present in response (EnvoyFilter is active)"
else
  echo "[WARN] x-feature-routed header not found. EnvoyFilter may not be applied yet."
fi

echo ""
echo "Done."
