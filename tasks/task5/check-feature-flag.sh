#!/bin/bash
set -e

mkdir -p logs
LOGFILE="logs/check-feature-flag.log"
echo "▶️ Проверка Feature Flag (X-Feature-Enabled: true)..." | tee "$LOGFILE"

curl -H "X-Feature-Enabled: true" http://localhost:9090/ping | tee -a "$LOGFILE"
