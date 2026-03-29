#!/usr/bin/env bash
set -euo pipefail

echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true) → маршрут на v2"
echo "   Port-forward: kubectl port-forward -n istio-system svc/istio-ingressgateway 9090:80"
echo

out=$(curl -sS --connect-timeout 3 -H "X-Feature-Enabled: true" "http://localhost:9090/ping")
echo "Ответ: $out"
if [[ "$out" == *v2* ]]; then
  echo "OK: ответ указывает на v2"
else
  echo "WARN: ожидался ответ с v2 (EnvoyFilter + VirtualService)"
  exit 1
fi
