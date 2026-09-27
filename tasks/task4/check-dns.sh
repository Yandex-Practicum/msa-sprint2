#!/bin/bash

set -e

echo "▶️ Running in-cluster DNS test (gRPC health check — booking-service is gRPC-only, no HTTP /ping)..."

kubectl run grpc-dns-test --rm -i --restart=Never \
  --image=alpine:3.20 \
  -- sh -c "apk add --no-cache curl >/dev/null 2>&1 && curl -sSL -o /tmp/grpc_health_probe https://github.com/grpc-ecosystem/grpc-health-probe/releases/latest/download/grpc_health_probe-linux-amd64 && chmod +x /tmp/grpc_health_probe && /tmp/grpc_health_probe -addr=booking-service:80" \
  && echo "✅ Success: booking-service resolved via DNS and responded to gRPC health check" \
  || echo "❌ Failed: booking-service not reachable via DNS/gRPC"
