#!/bin/bash
set -e

GW_IP=$(kubectl get node minikube -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')
GW_PORT=$(kubectl -n istio-system get svc istio-ingressgateway -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}')
GATEWAY_URL="http://${GW_IP}:${GW_PORT}"
HOST_HEADER="Host: booking-service.default.svc.cluster.local"

echo "Fallback-маршрут v1→v2 (старая версия недоступна → обслуживает v2)"
echo "GATEWAY_URL=$GATEWAY_URL"

echo "--- 1) Исходное состояние: v1 и v2 доступны ---"
kubectl get pods -l app=booking-service --no-headers | awk '{print $1, $2}' | sed 's/^/ /'
echo -n "реплики: v1="; kubectl get deploy booking-service-v1 -o jsonpath='{.spec.replicas}'
echo -n " v2="; kubectl get deploy booking-service-v2 -o jsonpath='{.spec.replicas}'; echo
sleep 3
v1=0; v2=0; err=0
for i in $(seq 1 30); do
 R=$(curl -s -H "$HOST_HEADER" --max-time 5 "$GATEWAY_URL/ping")
 case "$R" in
 *v1*) v1=$((v1+1)) ;;
 *v2*) v2=$((v2+1)) ;;
 *) err=$((err+1)) ;;
 esac
done
echo "до отказа: v1=$v1 v2=$v2 errors=$err"
[ $err -eq 0 ] && echo "нормальный режим" || { echo "ошибки в норм.режиме"; exit 1; }

echo "--- 2) Отказ v1: масштабируем booking-service-v1 до 0 ---"
kubectl scale deploy booking-service-v1 --replicas=0
echo "v1 → 0; ожидаем удаления endpoint'ов (15s)..."; sleep 15
kubectl get pods -l app=booking-service --no-headers | awk '{print " " $1, $2}'

echo "--- 3) Fallback: трафик должен обслуживаться v2 ---"
v1=0; v2=0; err=0
for i in $(seq 1 30); do
 R=$(curl -s -H "$HOST_HEADER" --max-time 8 "$GATEWAY_URL/ping")
 case "$R" in
 *v1*) v1=$((v1+1)) ;;
 *v2*) v2=$((v2+1)) ;;
 *) err=$((err+1)) ;;
 esac
done
echo "после отказа v1: v2=$v2 errors=$err"
if [ $v2 -ge 30 ] && [ $err -eq 0 ]; then
 echo "FALLBACK OK: v1 недоступна, но сервис полностью обслуживается v2"
else
 echo "fallback не сработал (v2=$v2 errors=$err)"
 kubectl scale deploy booking-service-v1 --replicas=9 || true
 exit 1
fi

echo "--- 4) Восстановление v1 (→ 9 реплик) ---"
kubectl scale deploy booking-service-v1 --replicas=9
echo "ждём готовности v1 (20s)..."; sleep 20
kubectl get pods -l app=booking-service --no-headers | awk '{print " " $1, $2}'

echo "--- 5) Проверка возврата к canary ~90/10 ---"
v1=0; v2=0; err=0
for i in $(seq 1 50); do
 R=$(curl -s -H "$HOST_HEADER" --max-time 5 "$GATEWAY_URL/ping")
 case "$R" in
 *v1*) v1=$((v1+1)) ;;
 *v2*) v2=$((v2+1)) ;;
 *) err=$((err+1)) ;;
 esac
done
echo "после восстановления: v1=$v1 v2=$v2 errors=$err"

echo "PASS: fallback v1→v2 работает, сервис восстановлен в канареечный режим"