#!/usr/bin/env bash

set -euo pipefail

echo "Проверка deployment booking-service..."
kubectl get pods -l app=booking-service

echo
echo "Проверка service booking-service..."
kubectl get svc booking-service

echo
echo "Проверка Helm-релиза..."
helm list | grep booking-service || echo "Релиз booking-service не найден"

echo
echo "Команда port-forward:"
echo "  kubectl port-forward svc/booking-service 8080:80"
echo "  curl http://127.0.0.1:8080/ping"

echo
if curl -fsS http://127.0.0.1:8080/ping >/dev/null; then
  echo "Сервис отвечает на http://127.0.0.1:8080/ping"
else
  echo "Port-forward пока не запущен (это ожидаемо, если вы его не запускали)."
fi
