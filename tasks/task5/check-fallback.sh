#!/bin/bash

set -e

echo "▶️ Testing fallback route..."

kubectl run fallback-test --rm -it \
  --image=curlimages/curl \
  --restart=Never \
  -- /bin/sh -c "for i in \$(seq 1 10); do curl http://booking-service/ping; echo; done"

