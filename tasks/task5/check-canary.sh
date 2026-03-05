#!/bin/bash

echo "============================================"
echo " Canary Traffic Distribution Check (90/10)"
echo "============================================"
echo ""

TOTAL=50
V1_COUNT=0
V2_COUNT=0
FAIL_COUNT=0

echo "Sending $TOTAL requests to /ping ..."
echo ""

for i in $(seq 1 $TOTAL); do
  RESPONSE=$(kubectl run canary-check-$i \
    --rm -i --restart=Never \
    --image=curlimages/curl:8.4.0 \
    --timeout=30s \
    -- curl -s --max-time 5 http://booking-service/ping 2>/dev/null) || RESPONSE="error"

  if echo "$RESPONSE" | grep -q "pong-v1"; then
    V1_COUNT=$((V1_COUNT + 1))
    echo "  [$i] -> pong-v1"
  elif echo "$RESPONSE" | grep -q "pong-v2"; then
    V2_COUNT=$((V2_COUNT + 1))
    echo "  [$i] -> pong-v2"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "  [$i] -> UNEXPECTED: '$RESPONSE'"
  fi
done

echo ""
echo "--- Results ---"
echo "Total requests:  $TOTAL"
echo "pong-v1 (v1):    $V1_COUNT ($(( V1_COUNT * 100 / TOTAL ))%)"
echo "pong-v2 (v2):    $V2_COUNT ($(( V2_COUNT * 100 / TOTAL ))%)"
echo "Failures:        $FAIL_COUNT"
echo ""

# Check that both versions received traffic
if [ $V1_COUNT -gt 0 ] && [ $V2_COUNT -gt 0 ]; then
  echo "[PASS] Both v1 and v2 received traffic (canary routing is active)"
else
  echo "[FAIL] Traffic was not split between v1 and v2"
  exit 1
fi

# Check approximate 90/10 split (allow generous tolerance: v2 between 2% and 35%)
V2_PCT=$(( V2_COUNT * 100 / TOTAL ))
if [ $V2_PCT -ge 2 ] && [ $V2_PCT -le 35 ]; then
  echo "[PASS] v2 received ~$V2_PCT% of traffic (expected ~10%, tolerance 2-35%)"
else
  echo "[WARN] v2 received $V2_PCT% of traffic (expected ~10%). Check VirtualService weights."
fi

echo ""
echo "Done."
