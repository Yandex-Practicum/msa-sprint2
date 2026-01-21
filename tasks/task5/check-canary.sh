#!/bin/bash

set -e

echo "▶️ Checking canary release (90% v1, 10% v2)..."

# Посылаем 100 запросов
for i in {1..100}; do
  curl -s http://localhost:9090/ping | grep -o "VERSION: v[12]" || echo "No version header"
done | sort | uniq -c