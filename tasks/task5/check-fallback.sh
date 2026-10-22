#!/bin/bash
URL=${URL:-http://localhost:9090/ping}

echo "▶️ Testing fallback route..."
POD=$(kubectl get pods -l app=booking-service,version=v1 -o jsonpath='{.items[0].metadata.name}')
echo "▶️ Удаляем под $POD"
kubectl delete pod "$POD" --wait=false

for i in {1..50}; do
  echo "$(curl -s -o /tmp/fb.txt -w '%{http_code}' "$URL") $(cat /tmp/fb.txt)"
done | sort | uniq -c
kubectl get pods -l app=booking-service
