IMAGE_NAME=booking-service
IMAGE_TAG=latest

# Docker socket for gitlab-ci-local (job uses DOCKER_HOST=unix:///var/run/docker.sock)
DOCKER_SOCK ?= /var/run/docker.sock

.PHONY: ci docker-build helm-staging

docker-build:
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) ./booking-service

helm-staging:
	helm upgrade --install booking-service ./helm/booking-service \
		-f ./helm/booking-service/values-staging.yaml --wait --timeout 120s

# Per assignment: gitlab-ci-local build test deploy tag (mount host Docker socket)
ci:
	gitlab-ci-local --volume "$(DOCKER_SOCK):/var/run/docker.sock" build test deploy tag
