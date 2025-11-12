IMAGE_NAME=booking-service
IMAGE_TAG=0.0.1-SNAPSHOT

ci:
	gitlab-ci-local

deploy:
	minikube start --driver=docker
	make build
	make deploy-staging
	make deploy-prod

build:
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) booking-service/

deploy-staging:
	minikube image load $(IMAGE_NAME):$(IMAGE_TAG)
	helm upgrade --install booking-staging helm/booking-service/ --values helm/booking-service/values-staging.yaml  --wait

deploy-prod:
	helm upgrade --install booking-prod helm/booking-service/ --values helm/booking-service/values-prod.yaml

port-forward-staging:
	kubectl port-forward svc/booking-staging 8080:80 &

port-forward-prod:
	kubectl port-forward svc/booking-prod 8081:80 &

test-dns:
	./check-dns.sh

test-status:
	./check-status.sh