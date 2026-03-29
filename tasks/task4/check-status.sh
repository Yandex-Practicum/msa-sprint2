#!/bin/bash
set -euo pipefail

echo "Checking booking-service deployment..."
kubectl get pods -l app=booking-service -o wide

echo
echo "Checking service..."
kubectl get svc booking-service || echo "(No service found)"

echo
echo "Helm release:"
helm list 2>/dev/null | grep booking-service || echo "(No release found)"

echo
echo "Port-forward to test service locally:"
echo "  kubectl port-forward svc/booking-service 8080:80"
echo "Then:"
echo "  curl http://localhost:8080/ping"

echo
echo "Quick curl (if port-forward already running):"
if curl -sf "http://localhost:8080/ping" | grep -q pong; then
  echo "Reachable: pong"
else
  echo "Not responding (start port-forward first)"
fi
