#!/usr/bin/env bash
# Однократная установка Istio в Minikube (как в task-info.md). Выполнять на машине с minikube, kubectl, istioctl.
set -euo pipefail

if ! command -v istioctl >/dev/null 2>&1; then
  echo "Добавьте istioctl в PATH (curl -L https://istio.io/downloadIstio | sh -)"
  exit 1
fi

istioctl install --set profile=demo -y
kubectl label namespace default istio-injection=enabled --overwrite
echo "Готово. Проверка: kubectl get pods -n istio-system && ./check-istio.sh"
