#!/bin/bash

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:19090}"
REQUESTS="${REQUESTS:-20}"

if [[ "$GATEWAY_URL" == "http://localhost:19090" && -z "${SKIP_PORT_FORWARD:-}" ]]; then
  kubectl -n istio-system port-forward svc/istio-ingressgateway 19090:80 >/tmp/istio-feature-port-forward.log 2>&1 &
  pf_pid=$!
  trap 'kill ${pf_pid} >/dev/null 2>&1 || true' EXIT
  sleep 2
fi

echo "[INFO] Checking feature flag routing through ${GATEWAY_URL}"

V2_COUNT=0
OTHER_COUNT=0

for i in $(seq 1 "$REQUESTS"); do
  response="$(curl -fsS -H "X-Feature-Enabled: true" "${GATEWAY_URL}/ping")"
  case "$response" in
    *"v2"*) V2_COUNT=$((V2_COUNT + 1)) ;;
    *) OTHER_COUNT=$((OTHER_COUNT + 1)) ;;
  esac
done

echo "[INFO] v2=${V2_COUNT}, other=${OTHER_COUNT}"

if [ "$V2_COUNT" -eq "$REQUESTS" ] && [ "$OTHER_COUNT" -eq 0 ]; then
  echo "[PASS] EnvoyFilter-backed X-Feature-Enabled=true routing sends all traffic to v2"
else
  echo "[ERROR] Expected every feature-flagged request to reach v2"
  exit 1
fi
