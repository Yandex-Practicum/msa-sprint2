#!/bin/bash
set -e

GW_IP=$(kubectl get node minikube -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')
GW_PORT=$(kubectl -n istio-system get svc istio-ingressgateway -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}')
GATEWAY_URL="http://${GW_IP}:${GW_PORT}"
HOST_HEADER="Host: booking-service.default.svc.cluster.local"

echo "Проверка установки Istio (istio-system)..."
kubectl get pods -n istio-system -o wide
echo

echo "Проверка инъекции sidecar в namespace 'default'..."
echo "istio-injection = $(kubectl get namespace default -o json | jq -r '.metadata.labels["istio-injection"]')"
echo

echo "Поды booking-service v1/v2 (ожидается 2/2 Running, sidecar инжектирован)..."
kubectl get pods -l app=booking-service -o wide
echo

echo "Istio-конфигурации: Gateway / VirtualService / DestinationRule / EnvoyFilter..."
kubectl get gateway,virtualservice,destinationrule,envoyfilter
echo

echo "Ingress-gateway URL для проверок..."
echo "GATEWAY_URL=$GATEWAY_URL"
echo "HOST_HEADER=$HOST_HEADER"
echo

echo "Сквозная проверка через ingress-gateway (Host: booking-service)..."
echo -n "HTTP-статус: "
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" -H "$HOST_HEADER" --max-time 10 "$GATEWAY_URL/ping"
echo -n "Ответ: "
curl -s -H "$HOST_HEADER" --max-time 10 "$GATEWAY_URL/ping"; echo