#!/bin/bash

set -e

URL="${URL:-http://localhost:9090/ping}"
REQUESTS="${REQUESTS:-100}"

echo "▶️ Checking canary release (90% v1, 10% v2)..."

# Посылаем запросы и считаем, какая версия ответила (заголовок X-App-Version)
v1=0; v2=0; errors=0
for i in $(seq 1 "$REQUESTS"); do
    version=$(curl -s -D - -o /dev/null "$URL" | tr -d '\r' | awk -F': ' 'tolower($1)=="x-app-version" {print $2}')
    case "$version" in
        v1) v1=$((v1 + 1)) ;;
        v2) v2=$((v2 + 1)) ;;
        *) errors=$((errors + 1)) ;;
    esac
done

echo "v1: $v1, v2: $v2, errors: $errors из $REQUESTS"
# Распределение случайное: на 100 запросах v2 обычно 5–15
if [ "$errors" -eq 0 ] && [ "$v1" -gt "$v2" ] && [ "$v2" -gt 0 ]; then
    echo "✅ Трафик делится между версиями, основная доля у v1"
else
    echo "❌ Распределение не похоже на 90/10"
    exit 1
fi
