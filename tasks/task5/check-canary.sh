#!/bin/bash

set -e

echo "▶️ Checking canary release (90% v1, 10% v2)..."

HOST_IP=$(grep nameserver /etc/resolv.conf | awk '{print $2}')

echo "Sending 100 requests to http://${HOST_IP}:8080/ping..."
# Посылаем 100 запросов
for i in {1..100}
do
    echo "Request $i:"
    curl http://${HOST_IP}:8080/ping
done

echo ""
echo "✅ Canary test completed: 100 requests sent"