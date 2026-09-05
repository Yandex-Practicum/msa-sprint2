#!/bin/bash

set -e

echo "▶️ Testing fallback: ожидаем ответ от v2 (т.к. v1 погашен)..."

# Проверяем, что при погашенном v1 трафик идёт на v2 и возвращается pong-v2.
# (run-all-tests.sh перед этим переключает маршрут на v2 и scale-ит v1 до 0)
OUT=$(bash curl-mesh.sh -s http://booking-service/ping)
echo "Ответ: $OUT"
echo "$OUT" | grep -q 'pong-v2' && echo "Fallback OK: ответ получен от v2" \
    || { echo "FALLBACK FAIL: ожидался pong-v2"; exit 1; }
