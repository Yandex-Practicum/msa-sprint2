Первое задание
1. В Dockerfile добавлено открытие порта 8080
2. Файл check-dns.sh перенесен в дирректорию рядом с Dockerfile
3. Следующие команды позволяют запустить сервис:
```
   docker build -t bs .C
   docker run -p 8080:8080 bs
```
4. Эндпоинт http://localhost:8080/ping возвращает pong

Второе задание
1. Был сконфигурирован Helm чарт в соответствии с описанием
2. Выполняем helm upgrade --install booking-mock-service . -f values-prod.yaml (без FEATURE_X флага)
3. Выполняем helm upgrade --install booking-mock-service . -f values-staging.yaml (с FEATURE_X флагом)