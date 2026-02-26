#!/bin/bash

set -e

echo "▶️ Testing fallback route..."
curl -H "Host: booking-service.default.svc.cluster.local" http://localhost:9090/ping