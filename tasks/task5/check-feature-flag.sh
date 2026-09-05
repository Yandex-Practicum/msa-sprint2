#!/bin/bash

set -e

echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true)..."

# Отправляем запрос из кластера (пода curl-client), с заголовком,
# чтобы маршрутизировать трафик на `v2` через VirtualService
bash curl-mesh.sh -H "X-Feature-Enabled: true" http://booking-service/ping
