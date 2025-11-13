#!/bin/bash

set -e

echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true)..."

# Отправляем запрос с заголовком, чтобы маршрутизировать трафик на `v2`
response=$(curl -s -H "X-Feature-Enabled: true" http://127.0.0.1:80/ping)
echo "$response"