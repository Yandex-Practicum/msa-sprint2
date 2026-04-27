#!/bin/bash

set -euo pipefail

echo "[INFO] Checking booking-service deployment..."
kubectl get pods -l app=booking-service

echo
echo "[INFO] Checking service..."
kubectl get svc booking-service || echo "(No service found)"

echo
echo "[INFO] Helm release:"
helm list | grep booking-service || echo "(No release found)"

echo
echo "[INFO] Port-forward and local /ping check..."
kubectl port-forward svc/booking-service 8080:80 >/tmp/booking-service-port-forward.log 2>&1 &
pf_pid=$!
trap 'kill ${pf_pid} >/dev/null 2>&1 || true' EXIT
sleep 2

response="$(curl --fail -sS http://localhost:8080/ping)"
echo "[INFO] /ping response: ${response}"

if [ "$response" = "pong" ]; then
  echo "[PASS] Reachable through port-forward"
else
  echo "[ERROR] Expected pong from port-forward"
  exit 1
fi
