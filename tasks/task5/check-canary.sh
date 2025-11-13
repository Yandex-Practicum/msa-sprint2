#!/bin/bash

set -e

echo "▶️ Checking canary release (90% v1, 10% v2)..."

# Собираем 100 ответов
v1_count=0
v2_count=0

for i in {1..100}; do
    response=$(curl -s http://127.0.0.1:80/ping)
    if [[ "$response" == "pong-v1" ]]; then
        v1_count=$((v1_count + 1))
    elif [[ "$response" == "pong-v2" ]]; then
        v2_count=$((v2_count + 1))
    fi
done

echo "v1: $v1_count"
echo "v2: $v2_count"
