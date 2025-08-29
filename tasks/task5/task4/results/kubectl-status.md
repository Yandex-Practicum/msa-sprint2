# kubectl get pods + get services

## Команда: kubectl get pods
```bash
kubectl get pods
```

## Результат
```
NAME                              READY   STATUS    RESTARTS   AGE
booking-service-c87b5c995-mj7bl   1/1     Running   0          82s
```

## Команда: kubectl get services
```bash
kubectl get services
```

## Результат
```
NAME              TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
booking-service   ClusterIP   10.103.160.209   <none>        80/TCP    82s
kubernetes        ClusterIP   10.96.0.1        <none>        443/TCP    101s
```

## Анализ статуса

### Pods
- **booking-service-c87b5c995-mj7bl**: 1/1 Ready, Running
- Возраст: 82 секунды
- Перезапусков: 0
- Статус: Running (работает корректно)

### Services
- **booking-service**: ClusterIP, порт 80, возраст 82 секунды
- **kubernetes**: ClusterIP, порт 443 (встроенный сервис)

## Вывод
- Pod booking-service успешно запущен и работает
- Service booking-service создан и доступен на порту 80
- Все компоненты развертывания функционируют корректно
- Kubernetes кластер работает стабильно
