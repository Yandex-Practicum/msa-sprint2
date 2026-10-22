#!/bin/bash
URL=${URL:-http://localhost:9090/ping}

echo "▶️ Checking canary release (90% v1, 10% v2)..."
v1=0; v2=0; err=0
for i in {1..100}; do
  r=$(curl -s "$URL")
  case "$r" in
    *v1*) v1=$((v1+1));;
    *v2*) v2=$((v2+1));;
    *) err=$((err+1));;
  esac
done
echo "v1: $v1  v2: $v2  errors: $err"
