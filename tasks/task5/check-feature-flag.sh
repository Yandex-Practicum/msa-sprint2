#!/bin/bash

set -e

echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true)..."

HOST_IP=$(grep nameserver /etc/resolv.conf | awk '{print $2}')

# Отправляем запрос с заголовком, чтобы маршрутизировать трафик на `v2`
curl -H "X-Feature-Enabled: true" http://${HOST_IP}:8080/ping
