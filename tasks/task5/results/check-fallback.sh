#!/bin/bash

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:19090}"
REQUESTS="${REQUESTS:-5}"

if [[ "$GATEWAY_URL" == "http://localhost:19090" && -z "${SKIP_PORT_FORWARD:-}" ]]; then
  kubectl -n istio-system port-forward svc/istio-ingressgateway 19090:80 >/tmp/istio-fallback-port-forward.log 2>&1 &
  pf_pid=$!
  trap 'kill ${pf_pid} >/dev/null 2>&1 || true' EXIT
  sleep 2
fi

echo "[INFO] Testing fallback route through ${GATEWAY_URL}"
echo "[INFO] Sending X-Force-Fail=true: Envoy calls v1, observes 5xx, then falls back to v2"

SUCCESS_COUNT=0
V2_COUNT=0
ERROR_COUNT=0
FALLBACK_HEADER_COUNT=0

for i in $(seq 1 "$REQUESTS"); do
  headers_file="$(mktemp)"
  response="$(curl -fsS -D "$headers_file" -H "X-Force-Fail: true" "${GATEWAY_URL}/ping" || true)"
  if [ -n "$response" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    ERROR_COUNT=$((ERROR_COUNT + 1))
  fi
  case "$response" in
    *"v2"*) V2_COUNT=$((V2_COUNT + 1)) ;;
  esac

  if tr -d '\r' < "$headers_file" | grep -qi '^x-fallback-from: v1$'; then
    FALLBACK_HEADER_COUNT=$((FALLBACK_HEADER_COUNT + 1))
  fi
  rm -f "$headers_file"
done

echo "[INFO] success=${SUCCESS_COUNT}, v2=${V2_COUNT}, fallback_header=${FALLBACK_HEADER_COUNT}, errors=${ERROR_COUNT}"

if [ "$SUCCESS_COUNT" -eq "$REQUESTS" ] && [ "$V2_COUNT" -eq "$REQUESTS" ] && [ "$FALLBACK_HEADER_COUNT" -eq "$REQUESTS" ] && [ "$ERROR_COUNT" -eq 0 ]; then
  echo "[PASS] Envoy fallback recovered failed v1 traffic on v2"
else
  echo "[ERROR] Envoy fallback did not recover failed v1 traffic on v2"
  exit 1
fi
