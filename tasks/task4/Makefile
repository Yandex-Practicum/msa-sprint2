IMAGE_NAME=booking-service
IMAGE_TAG=$(shell TZ=UTC date +%Y%m%d%H%M%S)

ci:
	gitlab-ci-local --variable IMAGE_TAG=$(IMAGE_TAG) build test deploy