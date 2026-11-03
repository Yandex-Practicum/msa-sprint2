#!/bin/bash

set -e

URL="${URL:-http://localhost:9090}"
REQUESTS="${REQUESTS:-20}"

count_v2() {
    local v2=0
    for i in $(seq 1 "$REQUESTS"); do
        version=$(curl -s -D - -o /dev/null "$@" "$URL/ping" | tr -d '\r' | awk -F': ' 'tolower($1)=="x-app-version" {print $2}')
        [ "$version" = "v2" ] && v2=$((v2 + 1))
    done
    echo "$v2"
}

echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true)..."

# Отправляем запрос с заголовком, чтобы маршрутизировать трафик на `v2`
curl -s -D - -H "X-Feature-Enabled: true" "$URL/ping" | tr -d '\r' | grep -i -E "^HTTP|^x-app-version"
echo
echo "Фича X на v2: $(curl -s -H "X-Feature-Enabled: true" "$URL/feature")"

with_flag=$(count_v2 -H "X-Feature-Enabled: true")
without_flag=$(count_v2)
spoofed=$(count_v2 -H "x-booking-route: v2")
echo "С X-Feature-Enabled: true — v2 ответила $with_flag из $REQUESTS"
echo "Без заголовка — v2 ответила $without_flag из $REQUESTS (канарейка 10%)"
echo "С подделанным x-booking-route: v2 — v2 ответила $spoofed из $REQUESTS (заголовок удаляется EnvoyFilter)"

if [ "$with_flag" -eq "$REQUESTS" ] && [ "$without_flag" -lt "$REQUESTS" ] && [ "$spoofed" -lt "$REQUESTS" ]; then
    echo "✅ Фича-флаг направляет трафик на v2"
else
    echo "❌ Фича-флаг не работает"
    exit 1
fi
