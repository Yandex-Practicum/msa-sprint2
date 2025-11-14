#!/bin/bash
set -e

mkdir -p logs

LOGFILE="logs/check-istio.log"
echo "▶️ Проверка установки Istio..." | tee "$LOGFILE"
kubectl get pods -n istio-system | tee -a "$LOGFILE"

echo "▶️ Проверка Istio инъекции в default namespace..." | tee -a "$LOGFILE"
kubectl get namespace default -o json | jq '.metadata.labels."istio-injection"' | tee -a "$LOGFILE"
