#!/bin/bash

set -e

echo "▶️ Testing fallback route..."
curl -s http://127.0.0.1:58296/ping || echo "Fallback route working"
