#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
kubectl apply -f "$ROOT/results/virtual-service.yaml"
kubectl apply -f "$ROOT/results/destination-rule.yaml"
kubectl apply -f "$ROOT/results/envoy-filter.yaml"
echo "Применено: Gateway, VirtualService, DestinationRule, EnvoyFilter"
