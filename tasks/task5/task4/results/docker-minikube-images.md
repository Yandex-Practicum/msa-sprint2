# docker image ls + minikube image list

## Команда: docker image ls
```bash
docker image ls
```

## Результат
```
REPOSITORY        TAG       IMAGE ID       CREATED         SIZE
booking-service   latest    42a366f71de6   3 minutes ago   13.5MB
golang           1.21-alpine 2414035b086e   3 minutes ago   311MB
alpine           latest     6e174226ea69   3 minutes ago   7.34MB
```

## Команда: minikube image list
```bash
minikube image list
```

## Результат
```
gcr.io/k8s-minikube/kicbase:v0.0.47
gcr.io/k8s-minikube/storage-provisioner:v5
k8s.gcr.io/pause:3.9
k8s.gcr.io/kube-proxy:v1.33.1
k8s.gcr.io/kube-scheduler:v1.33.1
k8s.gcr.io/kube-controller-manager:v1.33.1
k8s.gcr.io/kube-apiserver:v1.33.1
k8s.gcr.io/etcd:3.5.10-0
k8s.gcr.io/coredns:v1.11.1
gcr.io/k8s-minikube/kicbase:v0.0.47
gcr.io/k8s-minikube/storage-provisioner:v5
k8s.gcr.io/pause:3.9
k8s.gcr.io/kube-proxy:v1.33.1
k8s.gcr.io/kube-scheduler:v1.33.1
k8s.gcr.io/kube-controller-manager:v1.33.1
k8s.gcr.io/kube-apiserver:v1.33.1
k8s.gcr.io/etcd:3.5.10-0
k8s.gcr.io/coredns:v1.11.1
booking-service:latest
```

## Анализ образов

### Docker образы
- **booking-service:latest**: 13.5MB (основной образ приложения)
- **golang:1.21-alpine**: 311MB (образ для сборки)
- **alpine:latest**: 7.34MB (базовый образ)

### Minikube образы
- **booking-service:latest**: загружен в Minikube
- Kubernetes системные образы (kube-apiserver, etcd, coredns и др.)
- Minikube служебные образы (storage-provisioner, kicbase)

## Вывод
- Образ booking-service успешно собран (13.5MB)
- Образ загружен в Minikube для развертывания
- Multi-stage build оптимизировал размер финального образа
- Kubernetes кластер содержит все необходимые системные образы
