#!/bin/bash

set -e

echo "▶️ Running in-cluster DNS test..."

# -i без -t: скрипт работает и без интерактивного терминала (CI, IDE)
kubectl run dns-test --rm -i \
  --image=busybox \
  --restart=Never \
  -- wget -qO- http://booking-service/ping && echo && echo "✅ Success" || echo "❌ Failed"
