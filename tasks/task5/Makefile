IMAGE_NAME=booking-service
IMAGE_TAG=latest

ci:
	gitlab-ci-local

deploy_v1:
	helm install booking-service-v1 ./helm/booking-service/ \
      -f ./helm/booking-service/values.yaml \
      -f ./helm/booking-service/values.prod.yaml

deploy_v2:
	helm install booking-service-v2 ./helm/booking-service/ \
      -f ./helm/booking-service/values.yaml \
      -f ./helm/booking-service/values.staging.yaml

install_service:
	helm install service ./helm/service/

install_traffic:
	kubectl apply -f ./helm/traffic/booking-traffic_90_10.yaml


delete_traffic:
	kubectl delete -f ./helm/traffic/booking-traffic_90_10.yaml


uninstall:
	helm uninstall istio-config || true
	helm uninstall booking-service-v1 || true
	helm uninstall booking-service-v2 || true

# проверка фичафлага
# kubectl run test-pod --image=curlimages/curl -l app=test --rm -it -- sh
# curl -s http://booking-service/feature -H "X-Feature-Enabled: true"
