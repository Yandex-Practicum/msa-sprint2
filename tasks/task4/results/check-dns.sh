#!/bin/bash

set -euo pipefail

echo "[INFO] Running in-cluster DNS test..."

response="$(kubectl run dns-test --rm \
  -i \
  --image=busybox:1.36 \
  --restart=Never \
  -- wget -qO- http://booking-service/ping)"

echo "[INFO] DNS Response: ${response}"

if [[ "$response" == *"pong"* ]]; then
  echo "[PASS] DNS test succeeded"
else
  echo "[ERROR] Expected pong from http://booking-service/ping"
  exit 1
fi
