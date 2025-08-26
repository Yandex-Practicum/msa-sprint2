#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "   🐤 ПРОВЕРКА КАНАРЕЕЧНОГО ДЕПЛОЯ (90% v1, 10% v2)"
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

echo "📊 Отправляем 100 запросов и подсчитываем распределение..."
echo "─────────────────────────────────────────────────────────"

# Счетчики для версий
V1_COUNT=0
V2_COUNT=0
ERROR_COUNT=0

# Посылаем 100 запросов
for i in {1..100}
do
    RESPONSE=$(curl -s -w "\n%{http_code}" $URL 2>/dev/null || echo "ERROR")
    
    if echo "$RESPONSE" | grep -q "ERROR"; then
        ((ERROR_COUNT++))
    elif echo "$RESPONSE" | grep -q "pong-v1"; then
        ((V1_COUNT++))
        echo -n "1"
    elif echo "$RESPONSE" | grep -q "pong-v2"; then
        ((V2_COUNT++))
        echo -n "2"
    else
        ((ERROR_COUNT++))
        echo -n "E"
    fi
    
    # Перенос строки каждые 20 запросов для читаемости
    if [ $((i % 20)) -eq 0 ]; then
        echo ""
    fi
done

echo ""
echo ""
echo "📈 РЕЗУЛЬТАТЫ:"
echo "─────────────────────────────────────────────────────────"
echo "  ✅ Версия 1 (v1):    $V1_COUNT запросов ($((V1_COUNT))%)"
echo "  🆕 Версия 2 (v2):    $V2_COUNT запросов ($((V2_COUNT))%)"
if [ $ERROR_COUNT -gt 0 ]; then
    echo "  ❌ Ошибки:           $ERROR_COUNT запросов ($((ERROR_COUNT))%)"
fi
echo ""

# Проверяем соответствие ожидаемому распределению (с допуском ±15%)
if [ $V1_COUNT -ge 75 ] && [ $V1_COUNT -le 95 ] && [ $V2_COUNT -ge 5 ] && [ $V2_COUNT -le 25 ]; then
    echo "✅ КАНАРЕЕЧНЫЙ ДЕПЛОЙ РАБОТАЕТ КОРРЕКТНО!"
    echo "   Трафик распределяется примерно как 90/10"
elif [ $ERROR_COUNT -gt 10 ]; then
    echo "❌ СЛИШКОМ МНОГО ОШИБОК!"
    echo "   Проверьте, что сервисы запущены и Istio настроен правильно"
else
    echo "⚠️  РАСПРЕДЕЛЕНИЕ НЕ СООТВЕТСТВУЕТ ОЖИДАЕМОМУ!"
    echo "   Ожидалось примерно: v1=90%, v2=10%"
    echo "   Получено: v1=$((V1_COUNT))%, v2=$((V2_COUNT))%"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "   ✅ ТЕСТ ЗАВЕРШЁН"
echo "═══════════════════════════════════════════════════════"