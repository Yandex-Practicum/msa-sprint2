#!/bin/bash

set -e

echo "▶️ Checking canary release (90% v1, 10% v2)..."

pod=$(kubectl get pod -l app=booking-service -o jsonpath='{.items[0].metadata.name}')
if [ -z "$pod" ]; then
  echo "❌ booking-service pod not found"
  exit 1
fi

output=$(kubectl exec "$pod" -c booking-service -- sh -c '
  for i in $(seq 1 100); do
    echo "Request $i: $(curl -s http://booking-service/ping)"
  done
')

echo "$output"
echo
echo "Summary counts:"
echo "$output" | grep -o "pong-v[12]" | sort | uniq -c
