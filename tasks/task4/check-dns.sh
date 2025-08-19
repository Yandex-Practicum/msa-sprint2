#!/bin/bash

set -e

echo "▶️ Running in-cluster DNS test..."

kubectl run dns-test --rm -it \
  --image=busybox \
  --restart=Never \
  -- wget -qO- http://booking-service-staging/ping && echo "✅ Success" || echo "❌ Failed"