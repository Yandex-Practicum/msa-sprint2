#!/usr/bin/env bash

set -euo pipefail

echo "Запуск DNS-проверки внутри кластера..."
kubectl delete pod dns-test --ignore-not-found >/dev/null 2>&1 || true

if kubectl run dns-test --rm -i --restart=Never --image=busybox:1.36 --command -- \
  sh -c "wget -qO- http://booking-service/ping"; then
  echo "Успех"
else
  echo "Ошибка"
  exit 1
fi
