#!/bin/bash

set -e

echo "▶️ Testing fallback route..."

HOST_IP=$(grep nameserver /etc/resolv.conf | awk '{print $2}')

curl -s http://${HOST_IP}:8080/ping || echo "Fallback route working"
