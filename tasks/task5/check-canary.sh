#!/usr/bin/env bash
set -euo pipefail

echo "▶️ Checking canary release (90% v1, 10% v2) — 100 запросов к http://localhost:9090/ping"
echo "   Убедитесь: kubectl port-forward -n istio-system svc/istio-ingressgateway 9090:80"

v1=0
v2=0
other=0
for _ in {1..100}; do
  r=$(curl -sS --connect-timeout 3 "http://localhost:9090/ping" || echo "ERR")
  if [[ "$r" == *v1* ]]; then
    v1=$((v1 + 1))
  elif [[ "$r" == *v2* ]]; then
    v2=$((v2 + 1))
  else
    other=$((other + 1))
  fi
done

echo "Ответы с v1: $v1"
echo "Ответы с v2: $v2"
echo "Прочие/ошибки: $other"
echo "Ожидание (статистика): v1 ~90, v2 ~10"
