#!/bin/bash

set -e

echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true)..."

echo "Отправляем запрос с заголовком, чтобы маршрутизировать трафик на v2"
curl -H "X-Feature-Enabled: true" http://localhost:9090/feature
echo " "
echo  "Отправляем запрос с пустым заголовком, чтобы маршрутизировать трафик на v1"
curl -H "" http://localhost:9090/feature

