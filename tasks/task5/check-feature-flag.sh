#!/bin/bash
URL=${URL:-http://localhost:9090/ping}

echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true)..."
for i in {1..10}; do curl -s -H "X-Feature-Enabled: true" "$URL"; echo; done | sort | uniq -c

echo "▶️ Без заголовка:"
for i in {1..10}; do curl -s "$URL"; echo; done | sort | uniq -c
