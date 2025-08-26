#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "   🔄 ПРОВЕРКА FALLBACK МАРШРУТИЗАЦИИ"
echo "═══════════════════════════════════════════════════════"
echo ""

# Получаем URL Istio ingress gateway
INGRESS_HOST=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
if [ -z "$INGRESS_HOST" ]; then
    INGRESS_HOST=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.spec.clusterIP}' 2>/dev/null)
fi
if [ -z "$INGRESS_HOST" ]; then
    echo "❌ Не удалось получить адрес Istio Ingress Gateway"
    echo "   Используем port-forward: kubectl port-forward -n istio-system svc/istio-ingressgateway 9090:80"
    INGRESS_HOST="localhost"
    INGRESS_PORT="9090"
else
    INGRESS_PORT=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
fi

URL="http://${INGRESS_HOST}:${INGRESS_PORT}/ping"
echo "🔗 Тестируемый URL: $URL"
echo ""

echo "📋 Текущие поды booking-service:"
echo "─────────────────────────────────────────────────────────"
kubectl get pods -l app=booking-service -o wide --no-headers | awk '{print "  " $1 "\t" $3 "\t" $6}'
echo ""

echo "🔴 Симулируем сбой v1 (удаляем все поды v1)..."
echo "─────────────────────────────────────────────────────────"
V1_PODS=$(kubectl get pods -l app=booking-service,version=v1 -o name 2>/dev/null)
if [ -n "$V1_PODS" ]; then
    echo "$V1_PODS" | while read POD; do
        echo "  Удаляем: $POD"
        kubectl delete $POD --grace-period=0 --force 2>/dev/null &
    done
    sleep 3
    echo "  ✅ Поды v1 удалены"
else
    echo "  ⚠️  Поды v1 не найдены"
fi
echo ""

echo "📊 Проверяем fallback на v2 (отправляем 10 запросов)..."
echo "─────────────────────────────────────────────────────────"
SUCCESS_COUNT=0
V2_COUNT=0

for i in {1..10}
do
    echo -n "  Запрос $i: "
    RESPONSE=$(curl -s -m 2 $URL 2>/dev/null)
    
    if [ -z "$RESPONSE" ]; then
        echo "❌ Timeout"
    elif echo "$RESPONSE" | grep -q "pong-v2"; then
        echo "✅ v2 (fallback работает)"
        ((V2_COUNT++))
        ((SUCCESS_COUNT++))
    elif echo "$RESPONSE" | grep -q "pong-v1"; then
        echo "⚠️  v1 (всё ещё работает)"
        ((SUCCESS_COUNT++))
    else
        echo "❌ Ошибка: $RESPONSE"
    fi
done
echo ""

echo "📈 РЕЗУЛЬТАТЫ:"
echo "─────────────────────────────────────────────────────────"
echo "  ✅ Успешных запросов: $SUCCESS_COUNT из 10"
echo "  🆕 Ответов от v2:     $V2_COUNT"
echo ""

if [ $V2_COUNT -ge 8 ]; then
    echo "✅ FALLBACK РАБОТАЕТ КОРРЕКТНО!"
    echo "   При сбое v1 трафик успешно переключается на v2"
elif [ $SUCCESS_COUNT -ge 8 ]; then
    echo "⚠️  ЧАСТИЧНЫЙ FALLBACK"
    echo "   Некоторые запросы обрабатываются, но не все идут на v2"
else
    echo "❌ FALLBACK НЕ РАБОТАЕТ!"
    echo "   Проверьте конфигурацию VirtualService и DestinationRule"
fi
echo ""

echo "♻️  Восстанавливаем v1 для других тестов..."
echo "─────────────────────────────────────────────────────────"
# Здесь обычно Kubernetes автоматически восстановит поды через ReplicaSet
echo "  Поды v1 будут автоматически восстановлены через несколько секунд"
echo ""

echo "═══════════════════════════════════════════════════════"
echo "   ✅ ТЕСТ ЗАВЕРШЁН"
echo "═══════════════════════════════════════════════════════"
