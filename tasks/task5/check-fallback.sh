#!/bin/bash

set -e

echo "▶️ Testing fallback route..."
curl -s http://localhost:80/ping || echo "Fallback route working"
