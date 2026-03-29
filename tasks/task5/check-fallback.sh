#!/usr/bin/env bash
set -euo pipefail

echo "▶️ Testing fallback / устойчивость после потери пода"
echo "   Перед запуском: удалите один под v1, например:"
echo "   kubectl delete pod -l app=booking-service,version=v1 --field-selector=status.phase=Running | head -1"
echo "   Либо: kubectl delete pod -l version=v1"
echo "   Port-forward: kubectl port-forward -n istio-system svc/istio-ingressgateway 9090:80"
echo

curl -sS --connect-timeout 5 "http://localhost:9090/ping" || echo "curl failed (проверьте gateway и VirtualService)"
