#!/bin/bash

set -e

echo "▶️ Running in-cluster DNS test..."

kubectl run dns-test --rm -i --restart=Never \
  --image=busybox \
  -- wget -qO- http://booking-service:8080/ping && echo "✅ Success" || echo "❌ Failed"
