#!/bin/bash
PORT1=8080   # v1
PORT2=8081   # v2

echo "▶️ Проверка fallback маршрута..."

for i in {1..10}; do
    resp=$(curl -s -m 2 http://localhost:$PORT1/ping || curl -s http://localhost:$PORT2/ping)
    if [[ $resp == *'"feature_x":"true"'* ]]; then
        echo "$i: fallback to v2 ($resp)"
    else
        echo "$i: v1 response ($resp)"
    fi
done
