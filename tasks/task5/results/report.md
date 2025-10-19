1. install istio into a minikube cluster;
2. apply istio to the default namespace;
3. ensure envoy has been applied as a sidecar for the booking service (2 pods instead of 1):
```bash
➜  task4 git:(homework_sprint_2) ✗ kubectl get pods
NAME                               READY   STATUS    RESTARTS   AGE
booking-service-6799bddbfc-srl9c   2/2     Running   0          20h

➜  task4 git:(homework_sprint_2) ✗ kubectl get pods --all-namespaces | grep istio
istio-system   istio-egressgateway-66fcf465ff-8m7mq    1/1     Running   0               20h
istio-system   istio-ingressgateway-758c69f9f5-82vw4   1/1     Running   0               20h
istio-system   istiod-647dbbd65b-gk4wb                 1/1     Running   0               20h
```

4. create `values-{1,2}.yaml` holding respective values for `v{1,2}`;
5. add `virtual-service.yaml`;
6. don't use an envoy filtering for routing, instead handling it on a virtual service side. The reason is that an Envoy is rather complicated for the purpose of this assignment.
7. adjust `service.yaml` to ensure only one instance of it is being created, therefore, don't use template variables, and move it out of the `templates`;
8. adjust `deployment.yaml`;
9. not sure if I've set up a fallback from v1 to v2 correctly, because I was getting "no healthy upstream" after simulating a failure on v1 and activating a circuit breaker
```bash
➜  ~ curl localhost/flaky
some-response%                                                                                                                                 ➜  ~ curl localhost/flaky
An artificial error
➜  ~ curl localhost/flaky
no healthy upstream%

# Ingress logs
[2025-10-19T20:28:24.758Z] "GET /flaky HTTP/1.1" 200 - via_upstream - "-" 0 13 9 6 "10.244.0.1" "curl/8.7.1" "a4af5917-7f43-9cdc-8354-16ec9cb6991f" "localhost" "10.244.0.132:8080" outbound|80|v2|booking-service.default.svc.cluster.local 10.244.0.9:34302 10.244.0.9:8080 10.244.0.1:1334 - -
[2025-10-19T20:28:26.282Z] "GET /flaky HTTP/1.1" 500 URX via_upstream - "-" 0 20 118 117 "10.244.0.1" "curl/8.7.1" "f4f0ecba-03f3-95cc-8e89-c3e54a4c10e1" "localhost" "10.244.0.133:8080" outbound|80|v1|booking-service.default.svc.cluster.local 10.244.0.9:47780 10.244.0.9:8080 10.244.0.1:22803 - -
[2025-10-19T20:28:27.569Z] "GET /flaky HTTP/1.1" 503 UH no_healthy_upstream - "-" 0 19 0 - "10.244.0.1" "curl/8.7.1" "07972a92-50fc-9aa1-9b1e-9c5d6dc97178" "localhost" "-" outbound|80|v1|booking-service.default.svc.cluster.local - 10.244.0.9:8080 10.244.0.1:54415 - -
```
The same thing happened if I shut down all the `v1` pods:
```bash
➜  ~ kubectl get pods
NAME                                  READY   STATUS    RESTARTS   AGE
booking-service-v1-647b998b66-gks4k   2/2     Running   0          2m57s
booking-service-v1-647b998b66-pfpch   2/2     Running   0          2m57s
booking-service-v2-664dc68876-7cf9z   2/2     Running   0          19m
booking-service-v2-664dc68876-h6t6c   2/2     Running   0          19m
➜  ~ kubectl scale --replicas=0 deployment/booking-service-v1
deployment.apps/booking-service-v1 scaled
➜  ~ kubectl get pods                                        
NAME                                  READY   STATUS    RESTARTS   AGE
booking-service-v2-664dc68876-7cf9z   2/2     Running   0          19m
booking-service-v2-664dc68876-h6t6c   2/2     Running   0          19m

➜  ~ curl localhost/ping
no healthy upstream% 

[2025-10-19T20:30:06.833Z] "GET /ping HTTP/1.1" 503 UH no_healthy_upstream - "-" 0 19 0 - "10.244.0.1" "curl/8.7.1" "ca25e78a-ca90-9816-8358-b1c73eef26b2" "localhost" "-" outbound|80|v1|booking-service.default.svc.cluster.local - 10.244.0.9:8080 10.244.0.1:2684 - -
```

💡Note: testing was conducted through an opened tunnel:
```bash
sudo minikube tunnel --cleanup
```