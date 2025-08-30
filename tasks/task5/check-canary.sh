#!/bin/bash

set -e

echo "▶️ Checking canary release (90% v1, 10% v2)..."

# Посылаем 100 запросов
kubectl run canary-test --rm -it \
  --image=busybox \
  --restart=Never \
  -- /bin/sh -c "for i in \$(seq 1 100); do wget -qO- http://booking-service/ping; echo; done"
