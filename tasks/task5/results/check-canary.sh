#!/bin/bash

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:19090}"
REQUESTS="${REQUESTS:-200}"
V1_COUNT=0
V2_COUNT=0
OTHER_COUNT=0

if [[ "$GATEWAY_URL" == "http://localhost:19090" && -z "${SKIP_PORT_FORWARD:-}" ]]; then
  kubectl -n istio-system port-forward svc/istio-ingressgateway 19090:80 >/tmp/istio-canary-port-forward.log 2>&1 &
  pf_pid=$!
  trap 'kill ${pf_pid} >/dev/null 2>&1 || true' EXIT
  sleep 2
fi

echo "[INFO] Checking canary release through ${GATEWAY_URL} (${REQUESTS} requests)"

for i in $(seq 1 "$REQUESTS"); do
  response="$(curl -fsS "${GATEWAY_URL}/ping" || true)"
  case "$response" in
    *"v1"*) V1_COUNT=$((V1_COUNT + 1)) ;;
    *"v2"*) V2_COUNT=$((V2_COUNT + 1)) ;;
    *) OTHER_COUNT=$((OTHER_COUNT + 1)) ;;
  esac
done

echo "[INFO] v1=${V1_COUNT}, v2=${V2_COUNT}, other=${OTHER_COUNT}"

if [ "$V1_COUNT" -gt "$V2_COUNT" ] && [ "$V2_COUNT" -gt 0 ] && [ "$OTHER_COUNT" -eq 0 ]; then
  echo "[PASS] Canary traffic is weighted toward v1 and reaches v2"
else
  echo "[ERROR] Canary distribution is not weighted toward v1 with v2 canary traffic"
  exit 1
fi
