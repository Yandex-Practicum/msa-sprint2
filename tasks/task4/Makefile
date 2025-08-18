IMAGE_NAME=booking-service
IMAGE_TAG=latest

ci:
	gitlab-ci-local

deploy_prod:
	helm install prod-booking-service ./helm/booking-service/ -f ./helm/booking-service/values.yaml  -f ./helm/booking-service/values.prod.yaml

deploy_staging:
	helm install staging-booking-service ./helm/booking-service/ -f ./helm/booking-service/values.yaml  -f ./helm/booking-service/values.staging.yaml
