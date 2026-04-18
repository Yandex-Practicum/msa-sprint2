#!/bin/bash
set -e

echo "▶️ Checking canary release (90% v1, 10% v2)..."

v1=0
v2=0

for i in {1..100}
do
  result=$(curl -s http://localhost:19090/ping)
  if [ "$result" = "pong" ]; then
    v1=$((v1+1))
  elif [ "$result" = "pong-feature-x" ]; then
    v2=$((v2+1))
  fi
done

echo "v1(pong): $v1"
echo "v2(pong-feature-x): $v2"
