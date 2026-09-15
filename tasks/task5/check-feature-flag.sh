#!/bin/bash
set -e

GW_IP=$(kubectl get node minikube -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')
GW_PORT=$(kubectl -n istio-system get svc istio-ingressgateway -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}')
GATEWAY_URL="http://${GW_IP}:${GW_PORT}"
HOST_HEADER="Host: booking-service.default.svc.cluster.local"

echo "Фича-флаг: X-Feature-Enabled → маршрут на v2 + пометка EnvoyFilter'ом"
echo "GATEWAY_URL=$GATEWAY_URL"

echo "--- 1) Запрос С заголовком X-Feature-Enabled: true ---"
BODY=$(curl -s -H "$HOST_HEADER" -H "X-Feature-Enabled: true" --max-time 10 "$GATEWAY_URL/ping")
echo "body: $BODY"
echo "--- 2) Проверка заголовка от EnvoyFilter ---"
curl -s -D - -o /dev/null -H "$HOST_HEADER" -H "X-Feature-Enabled: true" --max-time 10 "$GATEWAY_URL/ping" | grep -iE "^HTTP/|^x-envoy-feature-flag"
echo "--- 3) Контроль: запрос БЕЗ заголовка (canary ~90/10) ---"
curl -s -H "$HOST_HEADER" --max-time 10 "$GATEWAY_URL/ping"; echo

case "$BODY" in
 *feature-on*)
 echo "PASS: фича-флаг включён, ответ от v2 (feature-on)" ;;
 *)
 echo "FAIL: ожидался ответ v2 (feature-on)"
 exit 1 ;;
esac