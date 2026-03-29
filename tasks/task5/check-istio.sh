#!/usr/bin/env bash
set -euo pipefail

echo "▶️ Проверка установки Istio..."
kubectl get pods -n istio-system

echo "▶️ Проверка Istio инъекции в default namespace..."
INJ=$(kubectl get namespace default -o jsonpath="{.metadata.labels['istio-injection']}" 2>/dev/null || true)
REV=$(kubectl get namespace default -o jsonpath='{.metadata.labels.istio\.io/rev}' 2>/dev/null || true)
if [[ "$INJ" == "enabled" ]]; then
  echo "OK: namespace default has istio-injection=enabled"
elif [[ -n "$REV" ]]; then
  echo "OK: namespace default has istio.io/rev=${REV}"
else
  echo "WARN: expected istio-injection=enabled (или revision label) на default"
  kubectl get namespace default -o yaml | sed -n '1,25p'
fi
