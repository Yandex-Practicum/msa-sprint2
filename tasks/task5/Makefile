IMAGE_NAME=booking-service
IMAGE_TAG=latest

kube-a:
	minikube status

kube-s:
	minikube start

kube-d:
	kubectl delete pod $(kubectl get pods | grep Error | awk '{print $1}')

ci:
	IMAGE_NAME=booking  IMAGE_TAG=latest gitlab-ci-local build deploy

pods:
	kubectl get pods,svc,virtualservice,destinationrule,gateways -n default

port-forward:
	kubectl port-forward -n istio-system svc/istio-ingressgateway 9090:80

uninstall:
	helm uninstall booking

logs:
	kubectl logs -l app=booking -n default
