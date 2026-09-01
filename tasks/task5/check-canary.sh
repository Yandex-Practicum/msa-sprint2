#!/bin/bash

set -e

echo "▶️ Checking canary release (90% v1, 10% v2)..."

# Посылаем 100 запросов
for i in {1..100}
do
    bash curl-mesh.sh -s http://booking-service/ping
done \
  | grep -oE 'x_feature_route_flag:pong-v[0-9]+' \
  | sort | uniq -c \
  | awk '{ print $2 " = " $1 }'