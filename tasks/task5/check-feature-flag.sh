#!/bin/bash
set -e
echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true)..."

kubectl run feature-test --image=curlimages/curl --restart=Never --quiet --rm -it -- \
    curl -H "X-Feature-Enabled: true" -s http://booking-service/ping