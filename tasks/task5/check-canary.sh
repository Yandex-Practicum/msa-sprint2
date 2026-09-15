#!/bin/bash
set -e

GW_IP=$(kubectl get node minikube -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')
GW_PORT=$(kubectl -n istio-system get svc istio-ingressgateway -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}')
GATEWAY_URL="http://${GW_IP}:${GW_PORT}"
HOST_HEADER="Host: booking-service.default.svc.cluster.local"

REQUESTS=${1:-200}
echo "Canary-релиз: ${REQUESTS} запросов через ingress-gateway (ожидается ~90% v1 / 10% v2)"
echo "GATEWAY_URL=$GATEWAY_URL"

v1=0; v2=0; err=0
for i in $(seq 1 "$REQUESTS"); do
 R=$(curl -s -H "$HOST_HEADER" --max-time 5 "$GATEWAY_URL/ping")
 case "$R" in
 *v1*) v1=$((v1+1)) ;;
 *v2*) v2=$((v2+1)) ;;
 *) err=$((err+1)) ;;
 esac
done

p1=$(( v1 * 100 / REQUESTS ))
p2=$(( v2 * 100 / REQUESTS ))
echo "──────────────────────────────────────"
echo "v1 = $v1 (${p1}%) | v2 = $v2 (${p2}%) | errors = $err"
echo "──────────────────────────────────────"

pass=0
[ $p1 -ge 80 ] && [ $p2 -ge 5 ] && [ $err -eq 0 ] && pass=1

if [ $pass -eq 1 ]; then
 echo "PASS: canary-баланс ~90/10 соблюдается, ошибок нет"
else
 echo "FAIL: распределение отклоняется от 90/10 или есть ошибки"
 exit 1
fi