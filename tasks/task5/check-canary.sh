#!/bin/bash
PORT1=8080
PORT2=8081
echo "▶️ Checking canary release (90% v1, 10% v2)..."
v1_count=0
v2_count=0
for i in {1..100}; do
    rand=$((RANDOM % 100))
    if [ $rand -lt 90 ]; then
        resp=$(curl -s http://localhost:$PORT1/ping)
        echo "$i: v1 ($resp)"
        v1_count=$((v1_count+1))
    else
        resp=$(curl -s http://localhost:$PORT2/ping)
        echo "$i: v2 ($resp)"
        v2_count=$((v2_count+1))
    fi
done
echo "📊 Summary: v1=$v1_count, v2=$v2_count"
