#!/bin/bash
set -e
echo "▶️ Running in-cluster feature test..."
kubectl run featx-test --rm -it --image=busybox --restart=Never -- wget -qO- http://booking-service-staging:80/feature && echo "✅ Success" || echo "❌ Failed"
