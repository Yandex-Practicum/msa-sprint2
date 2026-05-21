#!/bin/bash
set -e

echo "▶️ Начинаем тестирование Fallback-маршрута..."

# Шаг 1: Создаем тестовый под с Istio-прокси
if kubectl get pod test &>/dev/null; then
  kubectl delete pod test --force --grace-period=0
  sleep 5
fi

echo "Создаем изолированный тестовый под с Istio-sidecar..."
kubectl run test --image=alpine/curl --restart=Never -- sleep 3600
kubectl label pod test sidecar.istio.io/inject=true --overwrite
echo "Ожидаем запуск тестового пода..."
kubectl wait --for=condition=Ready pod/test --timeout=60s

echo "⚠️ Симулируем аварию: масштабируем v1 в 0 реплик..."
kubectl scale deployment booking-service-v1 --replicas=0
sleep 10

echo "🚀 Проверяем автоматическое перенаправление трафика на v2..."
success_count=0

for i in $(seq 1 10); do
  result=$(kubectl exec pod/test -- curl -s --max-time 2 http://booking-service/ping 2>/dev/null || echo "ERROR")

  if [[ "$result" == *"pong"* ]]; then
    echo "Запрос $i: Успешно! (Ответ: $result) ✅"
    ((success_count++))
  else
    echo "Запрос $i: Ошибка! (Ответ: $result) ❌"
  fi
done

echo ""
echo "🔄 Восстанавливаем стабильное окружение: возвращаем реплики v1..."
kubectl scale deployment booking-service-v1 --replicas=2
sleep 10

echo "--------------------------------------------------"
if [ "$success_count" -eq 10 ]; then
  echo "🎉 ИТОГ: Fallback-маршрутизация работает!"
else
  echo "🚨 ИТОГ: Успешно $success_count из 10 запросов"
fi
echo "--------------------------------------------------"

# Удаляем тестовый под
kubectl delete pod test --force --grace-period=0