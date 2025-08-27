#!/bin/bash

echo "▶️ Checking canary release (90% v1, 10% v2)..."

v1=0
v2=0

for i in {1..100}; do
    response=$(curl -s http://localhost:8080/ping)
    echo "$response"
    if [[ "$response" == *"version1"* ]]; then
        ((v1++))
    elif [[ "$response" == *"version2"* ]]; then
        ((v2++))
    fi
done

echo "version1: $v1"
echo "version2: $v2"