#!/bin/bash

echo "[INFO] Running in-cluster DNS test..."

RESPONSE=$(kubectl run dns-test --rm -i --quiet \
  --image=busybox \
  --restart=Never \
  -- wget -qO- http://booking-service/ping 2>/dev/null)

echo "[INFO] DNS Response: $RESPONSE"
if [[ "$RESPONSE" == *pong* ]]; then
  echo "[PASS] DNS test succeeded"
else
  echo "[FAIL] DNS test failed"
  exit 1
fi
