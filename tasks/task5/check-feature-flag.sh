#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "   🚩 ПРОВЕРКА FEATURE FLAG МАРШРУТИЗАЦИИ"
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

BASE_URL="http://${INGRESS_HOST}:${INGRESS_PORT}"
echo "🔗 Базовый URL: $BASE_URL"
echo ""

echo "📊 Тест 1: Запросы БЕЗ feature flag (должны идти 90% v1, 10% v2)"
echo "─────────────────────────────────────────────────────────"
V1_COUNT=0
V2_COUNT=0

for i in {1..20}
do
    RESPONSE=$(curl -s "${BASE_URL}/ping" 2>/dev/null)
    if echo "$RESPONSE" | grep -q "pong-v1"; then
        ((V1_COUNT++))
        echo -n "1"
    elif echo "$RESPONSE" | grep -q "pong-v2"; then
        ((V2_COUNT++))
        echo -n "2"
    else
        echo -n "E"
    fi
done
echo ""
echo "  Результат: v1=$V1_COUNT, v2=$V2_COUNT (ожидалось ~18:2)"
echo ""

echo "📊 Тест 2: Запросы С feature flag (все должны идти на v2)"
echo "─────────────────────────────────────────────────────────"
V1_WITH_FLAG=0
V2_WITH_FLAG=0

for i in {1..20}
do
    RESPONSE=$(curl -s -H "X-Feature-Enabled: true" "${BASE_URL}/ping" 2>/dev/null)
    if echo "$RESPONSE" | grep -q "pong-v1"; then
        ((V1_WITH_FLAG++))
        echo -n "1"
    elif echo "$RESPONSE" | grep -q "pong-v2"; then
        ((V2_WITH_FLAG++))
        echo -n "2"
    else
        echo -n "E"
    fi
done
echo ""
echo "  Результат: v1=$V1_WITH_FLAG, v2=$V2_WITH_FLAG (ожидалось 0:20)"
echo ""

echo "📊 Тест 3: Проверка feature endpoint с заголовком"
echo "─────────────────────────────────────────────────────────"
echo "  Запрос с X-Feature-Enabled: true..."
FEATURE_RESPONSE=$(curl -s -H "X-Feature-Enabled: true" "${BASE_URL}/feature" 2>/dev/null)
echo "  Ответ: $FEATURE_RESPONSE"
echo ""

echo "📊 Тест 4: Проверка feature endpoint без заголовка"
echo "─────────────────────────────────────────────────────────"
echo "  Запрос без заголовка..."
NO_FEATURE_RESPONSE=$(curl -s "${BASE_URL}/feature" 2>/dev/null)
echo "  Ответ: $NO_FEATURE_RESPONSE"
echo ""

echo "📈 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:"
echo "─────────────────────────────────────────────────────────"
echo "  Без флага: v1=$V1_COUNT, v2=$V2_COUNT"
echo "  С флагом:  v1=$V1_WITH_FLAG, v2=$V2_WITH_FLAG"
echo ""

# Проверка корректности
if [ $V2_WITH_FLAG -eq 20 ] && [ $V1_WITH_FLAG -eq 0 ]; then
    echo "✅ FEATURE FLAG МАРШРУТИЗАЦИЯ РАБОТАЕТ КОРРЕКТНО!"
    echo "   Все запросы с X-Feature-Enabled:true идут на v2"
elif [ $V2_WITH_FLAG -ge 18 ]; then
    echo "⚠️  FEATURE FLAG РАБОТАЕТ ЧАСТИЧНО"
    echo "   Большинство запросов идёт на v2, но есть исключения"
else
    echo "❌ FEATURE FLAG НЕ РАБОТАЕТ!"
    echo "   Проверьте VirtualService и EnvoyFilter конфигурацию"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "   ✅ ТЕСТ ЗАВЕРШЁН"
echo "═══════════════════════════════════════════════════════"
