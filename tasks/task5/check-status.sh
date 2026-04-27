#!/bin/bash

set -euo pipefail

echo "[INFO] Checking booking-service deployment..."
kubectl get pods -l app=booking-service --show-labels

echo
echo "[INFO] Checking service..."
kubectl get svc booking-service || echo "(No service found)"

echo
echo "[INFO] Helm release:"
helm list | grep booking-service || echo "(No release found)"

echo
echo "[INFO] Istio routing resources:"
kubectl get gateway,virtualservice,destinationrule,envoyfilter 2>/dev/null || true
kubectl get envoyfilter -n istio-system booking-feature-flag-route 2>/dev/null || true

echo
echo "[INFO] Port-forward Istio ingress gateway and local /ping check..."
kubectl -n istio-system port-forward svc/istio-ingressgateway 19090:80 >/tmp/istio-ingress-port-forward.log 2>&1 &
pf_pid=$!
trap 'kill ${pf_pid} >/dev/null 2>&1 || true' EXIT
sleep 2

response="$(curl --fail -sS http://localhost:19090/ping)"
echo "[INFO] /ping response: ${response}"

if [[ "$response" == pong* ]]; then
  echo "[PASS] Reachable through Istio ingress gateway"
else
  echo "[ERROR] Expected pong response through Istio ingress gateway"
  exit 1
fi
