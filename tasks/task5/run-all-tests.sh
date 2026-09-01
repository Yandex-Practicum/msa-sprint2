#!/bin/bash
#
# run-all-tests.sh - прогон всех проверок task5 (check-istio / check-feature-flag /
#                   check-canary / check-fallback) после start-istio.bat.
#
# ВАЖНО: для корректной работы тестов нужно, чтобы в mesh существовал под
# curl-client (kubectl apply -f test-client.yaml). start-istio.bat его НЕ создаёт,
# поэтому скрипт применяет манифест сам и ждёт готовности подов.

set -e
cd "$(dirname "$0")"
RESULTS=results
mkdir -p "$RESULTS"

echo "=== [0] Применяем тест-клиент curl-client (из mesh) ==="
kubectl apply -f test-client.yaml

echo
echo "=== Ожидание готовности подов ==="
kubectl wait --for=condition=ready pod -l app=booking-service --timeout=180s
kubectl wait --for=condition=ready pod -l app=curl-client --timeout=120s
kubectl get pods -l app=booking-service

run_check() {
    name=$1
    echo
    echo "=============================================="
    echo "  >>> $name"
    echo "=============================================="
    bash "$name.sh" | tee "$RESULTS/$name.txt"
}

run_check check-istio
run_check check-feature-flag
run_check check-canary

# === Имитируем "падение" v1: маршрут на v2 + убийство всех подов v1 ===
echo
echo "=== Fallback-тест: накатываем конфиг с fallback вместо канарейки и выключаем все поды с v1 ==="
kubectl apply -f booking-service-traffic-fallback.yaml
# Выключаем все поды v1 (имитируем отказ версии v1)
kubectl scale deployment/booking-service-v1 --replicas=0
# Ждём, пока Envoy выведет v1 endpoints из балансировки
sleep 10

# Выполним чек, много раз и теперь все должны попасть в v2
run_check check-fallback

# === Восстанавливаем после теста fallback ===
echo
echo "=== Восстанавливаем поды v1 и канареечный маршрут ==="
# Возвращаем число реплик v1 (3 по helm values) и ждём готовности
kubectl scale deployment/booking-service-v1 --replicas=3
kubectl rollout status deployment/booking-service-v1 --timeout=120s
kubectl wait --for=condition=ready pod -l app=booking-service --timeout=120s
# Возвращаем основной VirtualService (канарейка 90/10)
kubectl apply -f booking-service-virtual-Service.yaml

echo
echo "=============================================="
echo " Все проверки завершены. Текущее состояние:"
kubectl get pods -l app=booking-service
echo " Результаты сохранены в $RESULTS/"
echo "=============================================="