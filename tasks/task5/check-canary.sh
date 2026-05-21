#!/bin/bash
set -e

echo "▶️ Checking canary release (90% v1, 10% v2)..."
echo "Sending 100 requests..."

v1=0
v2=0

for i in $(seq 1 100); do
  version=$(kubectl exec deploy/booking-service-v1 -c booking-service -- wget -qO- -S http://booking-service/ping 2>&1 | grep "x-version" | awk '{print $2}' | tr -d '\r')
  if [ "$version" = "v1" ]; then
    v1=$((v1+1))
  elif [ "$version" = "v2" ]; then
    v2=$((v2+1))
  fi
done

echo "v1: $v1 requests"
echo "v2: $v2 requests"
echo "Expected: ~90 v1, ~10 v2"