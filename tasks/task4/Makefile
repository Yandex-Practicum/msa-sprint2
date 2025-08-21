IMAGE_TAG = latest
IMAGE_PROD_TAG = 1.0.0
IMAGE_NAME = booking-service
CONTAINER_NAME = b-service

# Переменные
GITLAB_CI_LOCAL = gitlab-ci-local
CI_FILE = .gitlab-ci.yml

pipelines:
	@echo "use ci to run pipline"
	@echo "IMAGE_NAME=$(IMAGE_NAME);" 
	@echo "IMAGE_TAG=$(IMAGE_TAG);"
	@echo "IMAGE_PROD_TAG=$(IMAGE_PROD_TAG);"
	@echo "CONTAINER_NAME =$(CONTAINER_NAME);"


list-jobs: ## Показать все доступные jobs
	$(GITLAB_CI_LOCAL) --list

test: ## Запустить тесты
	$(GITLAB_CI_LOCAL) --job test --variable IMAGE_NAME=$(IMAGE_NAME) --variable IMAGE_TAG=$(IMAGE_TAG)

build: ## Запустить сборку
	$(GITLAB_CI_LOCAL) --job build --variable IMAGE_NAME=$(IMAGE_NAME) --variable IMAGE_TAG=$(IMAGE_TAG)

deploy-staging: ## Деплой на staging
	$(GITLAB_CI_LOCAL) --job deploy-staging --variable IMAGE_NAME=$(IMAGE_NAME) --variable IMAGE_TAG=$(IMAGE_TAG)

tag: 
	$(GITLAB_CI_LOCAL) --job tag --variable IMAGE_NAME=$(IMAGE_NAME) --variable IMAGE_TAG=$(IMAGE_TAG)

deploy-prod: ## Деплой на production
	$(GITLAB_CI_LOCAL) --job deploy-prod --variable IMAGE_NAME=$(IMAGE_NAME) --variable IMAGE_PROD_TAG=$(IMAGE_PROD_TAG)
clean:
	$(GITLAB_CI_LOCAL) --job clean --variable CONTAINER_NAME=$(CONTAINER_NAME)

remove: 
	helm uninstall booking-service

ci: test build deploy-staging deploy-prod tag

