IMAGE_NAME=booking-service
IMAGE_TAG=latest

ci-stage:
	IMAGE_NAME=booking-service  IMAGE_TAG=latest gitlab-ci-local build test deploy_stage tag

ci-prod:
	IMAGE_NAME=booking-service  IMAGE_TAG=latest gitlab-ci-local build test deploy_prod
