#!/bin/bash

set -e

echo "═══════════════════════════════════════════════════════"
echo "   📡 ПРОВЕРКА УСТАНОВКИ ISTIO"
echo "═══════════════════════════════════════════════════════"
echo ""

echo "▶️ Проверка установки Istio..."
echo "─────────────────────────────────────────────"
kubectl get pods -n istio-system --no-headers | awk '{print $1 "\t" $2 "\t" $3}'
echo ""

echo "▶️ Проверка версии Istio..."
echo "─────────────────────────────────────────────"
istioctl version --short || echo "istioctl не установлен"
echo ""

echo "▶️ Проверка Istio инъекции в default namespace..."
echo "─────────────────────────────────────────────"
INJECTION=$(kubectl get namespace default -o json | jq -r '.metadata.labels."istio-injection"')
if [ "$INJECTION" = "enabled" ]; then
    echo "✅ Istio injection: ENABLED"
else
    echo "❌ Istio injection: DISABLED"
    echo "   Выполните: kubectl label namespace default istio-injection=enabled"
fi
echo ""

echo "▶️ Проверка sidecar контейнеров в подах..."
echo "─────────────────────────────────────────────"
kubectl get pods -l app=booking-service -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}' 2>/dev/null || echo "Поды booking-service не найдены"
echo ""

echo "▶️ Проверка Istio ресурсов..."
echo "─────────────────────────────────────────────"
echo "Gateways:"
kubectl get gateway --no-headers 2>/dev/null | awk '{print "  - " $1}' || echo "  Нет"
echo ""
echo "VirtualServices:"
kubectl get virtualservice --no-headers 2>/dev/null | awk '{print "  - " $1}' || echo "  Нет"
echo ""
echo "DestinationRules:"
kubectl get destinationrule --no-headers 2>/dev/null | awk '{print "  - " $1}' || echo "  Нет"
echo ""
echo "EnvoyFilters:"
kubectl get envoyfilter --no-headers 2>/dev/null | awk '{print "  - " $1}' || echo "  Нет"
echo ""

echo "═══════════════════════════════════════════════════════"
echo "   ✅ ПРОВЕРКА ЗАВЕРШЕНА"
echo "═══════════════════════════════════════════════════════"