#!/bin/bash
set -e
istioctl install --set profile=demo -y
kubectl label namespace default istio-injection=enabled --overwrite

helm uninstall booking-service 2>/dev/null || true

docker build -t booking-service:latest ./booking-service
minikube image load booking-service:latest

helm upgrade --install booking-service-v1 ./helm/booking-service -f helm/booking-service/values-v1.yaml
helm upgrade --install booking-service-v2 ./helm/booking-service -f helm/booking-service/values-v2.yaml
kubectl rollout restart deployment/booking-service-v1 deployment/booking-service-v2
kubectl rollout status deployment/booking-service-v1
kubectl rollout status deployment/booking-service-v2

kubectl apply -f istio/
kubectl get virtualservices,destinationrules,gateways
kubectl get envoyfilter -n istio-system

echo "Дальше: kubectl -n istio-system port-forward svc/istio-ingressgateway 9090:80"
