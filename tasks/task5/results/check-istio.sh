#!/bin/bash

set -euo pipefail

echo "[INFO] Checking Istio control plane..."
kubectl get pods -n istio-system

echo
echo "[INFO] Checking default namespace sidecar injection label..."
injection_label="$(kubectl get namespace default -o jsonpath='{.metadata.labels.istio-injection}')"
echo "[INFO] istio-injection=${injection_label}"

if [ "$injection_label" != "enabled" ]; then
  echo "[ERROR] Expected istio-injection=enabled on namespace default"
  exit 1
fi

echo
echo "[INFO] Checking booking-service pods and sidecars..."
kubectl get pods -l app=booking-service --show-labels

pod_count="$(kubectl get pods -l app=booking-service --no-headers 2>/dev/null | wc -l | tr -d ' ')"
if [ "$pod_count" -eq 0 ]; then
  echo "[ERROR] No booking-service pods found"
  exit 1
fi

pods_without_sidecar="$(kubectl get pods -l app=booking-service -o jsonpath='{range .items[*]}{.metadata.name}{" containers="}{range .spec.containers[*]}{.name}{","}{end}{" init="}{range .spec.initContainers[*]}{.name}{","}{end}{"\n"}{end}' | grep -v 'istio-proxy' || true)"
if [ -n "$pods_without_sidecar" ]; then
  echo "[ERROR] Some booking-service pods do not have istio-proxy:"
  echo "$pods_without_sidecar"
  exit 1
fi

echo "[PASS] Istio is installed and sidecar injection is enabled"
