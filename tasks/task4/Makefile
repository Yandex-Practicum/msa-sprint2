IMAGE_NAME ?= booking-service
IMAGE_TAG ?= latest
TEST_NAME ?= booking-service-ci-test
TEST_PORT ?= 18080
HELM_RELEASE ?= booking-service
HELM_CHART ?= helm/booking-service
VALUES_FILE ?= helm/booking-service/values-staging.yaml

.PHONY: unit build test deploy tag ci dns status

unit:
	docker run --rm -v "$(CURDIR)/booking-service:/src" -w /src golang:1.21-alpine go test ./...

build:
	docker build -t "$(IMAGE_NAME):$(IMAGE_TAG)" booking-service

test:
	docker rm -f "$(TEST_NAME)" || true
	docker run -d --name "$(TEST_NAME)" -p "$(TEST_PORT):8080" "$(IMAGE_NAME):$(IMAGE_TAG)"
	docker exec "$(TEST_NAME)" wget -qO- http://localhost:8080/ping | grep '^pong$$'
	docker exec "$(TEST_NAME)" wget -qO- http://localhost:8080/ready | grep '^ready$$'
	docker rm -f "$(TEST_NAME)"

deploy:
	minikube image load "$(IMAGE_NAME):$(IMAGE_TAG)"
	helm upgrade --install "$(HELM_RELEASE)" "$(HELM_CHART)" -f "$(VALUES_FILE)" --set image.name="$(IMAGE_NAME)" --set image.tag="$(IMAGE_TAG)"
	kubectl rollout status "deployment/$(HELM_RELEASE)"

tag:
	git tag "task4-$$(date +%Y%m%d%H%M%S)"

ci:
	gitlab-ci-local unit_test build test deploy tag

dns:
	./check-dns.sh

status:
	./check-status.sh
