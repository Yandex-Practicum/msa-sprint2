IMAGE_NAME=booking-service
IMAGE_TAG=latest

# Build docker image
build:
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) ./booking-service

# Load image into minikube
load:
	minikube image load $(IMAGE_NAME):$(IMAGE_TAG)

# Deploy v1 and v2 via Helm
deploy: load
	helm upgrade --install booking-service-v1 ./helm/booking-service \
		-f ./helm/booking-service/values-v1.yaml
	helm upgrade --install booking-service-v2 ./helm/booking-service \
		-f ./helm/booking-service/values-v2.yaml

# Apply Istio resources
istio:
	kubectl apply -f ./istio/

# Full setup: build + deploy + istio
setup: build deploy istio

# Show URL for Istio ingress gateway (NodePort)
url:
	@echo "Ingress URL: http://$(shell minikube ip):$(shell kubectl -n istio-system get svc istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')/ping"

# Port-forward Istio ingress gateway on :9090 (requires Gateway+VirtualService applied)
pf:
	kubectl port-forward -n istio-system svc/istio-ingressgateway 9090:80

# Run all checks
check:
	bash check-istio.sh
	bash check-canary.sh
	bash check-feature-flag.sh

# Run local CI
ci:
	gitlab-ci-local
