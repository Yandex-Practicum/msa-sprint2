IMAGE_NAME ?= booking-service
IMAGE_TAG ?= task5
TEST_NAME ?= booking-service-ci-test
TEST_PORT ?= 18080
HELM_RELEASE_V1 ?= booking-service-v1
HELM_RELEASE_V2 ?= booking-service-v2
HELM_CHART ?= helm/booking-service
VALUES_FILE_V1 ?= helm/booking-service/values-v1.yaml
VALUES_FILE_V2 ?= helm/booking-service/values-v2.yaml

.PHONY: unit build test deploy istio tag ci dns status canary fallback feature

unit:
	docker run --rm -v "$(CURDIR)/booking-service:/src" -w /src golang:1.21-alpine go test ./...

build:
	docker build -t "$(IMAGE_NAME):$(IMAGE_TAG)" booking-service

test:
	docker rm -f "$(TEST_NAME)" || true
	docker run -d --name "$(TEST_NAME)" -p "$(TEST_PORT):8080" "$(IMAGE_NAME):$(IMAGE_TAG)"
	docker exec "$(TEST_NAME)" wget -qO- http://localhost:8080/ping | grep '^pong '
	docker exec "$(TEST_NAME)" wget -qO- http://localhost:8080/ready | grep '^ready$$'
	docker rm -f "$(TEST_NAME)"

deploy:
	minikube image load "$(IMAGE_NAME):$(IMAGE_TAG)"
	kubectl label namespace default istio-injection=enabled --overwrite
	helm upgrade --install "$(HELM_RELEASE_V1)" "$(HELM_CHART)" -f "$(VALUES_FILE_V1)" --set image.name="$(IMAGE_NAME)" --set image.tag="$(IMAGE_TAG)"
	helm upgrade --install "$(HELM_RELEASE_V2)" "$(HELM_CHART)" -f "$(VALUES_FILE_V2)" --set image.name="$(IMAGE_NAME)" --set image.tag="$(IMAGE_TAG)"
	kubectl apply -f istio/
	kubectl rollout status "deployment/$(HELM_RELEASE_V1)"
	kubectl rollout status "deployment/$(HELM_RELEASE_V2)"

istio:
	istioctl install --set profile=demo -y
	kubectl label namespace default istio-injection=enabled --overwrite

tag:
	git tag "task5-$$(date +%Y%m%d%H%M%S)"

ci:
	gitlab-ci-local unit_test build test deploy tag

dns:
	./check-dns.sh

status:
	./check-status.sh

canary:
	./check-canary.sh

fallback:
	./check-fallback.sh

feature:
	./check-feature-flag.sh
