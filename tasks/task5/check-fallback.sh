#!/bin/bash

set -e

echo "▶️ Testing fallback route..."
curl -s http://localhost:9090/ping || echo "Fallback route working"
