#!/bin/bash

set -e

echo "▶️ Checking booking-service deployment..."
kubectl get pods -l app=booking-service

echo
echo "▶️ Checking service..."
kubectl get svc booking-service || echo "(No service found)"

echo
echo "▶️ Helm release:"
helm list | grep booking-service || echo "(No release found)"

echo
echo "ENABLE_FEATURE_X in pod:"
kubectl get deployment booking-service \
 -o jsonpath='{.spec.template.spec.containers[0].env}' 2>/dev/null || true
echo
echo

echo "▶️ Local curl via port-forward (svc/booking-service 8080:80):"
kubectl port-forward svc/booking-service 8080:80 >/dev/null 2>&1 &
PF=$!
trap 'kill $PF 2>/dev/null' EXIT
sleep 3

printf " GET /ping -> "
curl --fail -s http://localhost:8080/ping && echo
printf " GET /ready -> "
curl --fail -s http://localhost:8080/ready && echo
printf " GET /feature-> "
curl --fail -s http://localhost:8080/feature && echo
echo "Reachable"