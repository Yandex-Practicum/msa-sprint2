#!/bin/bash

set -e

echo "Checking canary release (90% v1, 10% v2)..."

# Посылаем 20 запросов через kubectl exec
for i in {1..20}
do
    echo "Request $i:"
    kubectl run test-canary-$i --image=curlimages/curl --rm -it --restart=Never -- curl -s --max-time 5 http://booking-service/ping
    echo
done