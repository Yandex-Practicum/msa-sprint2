# Скриншот успешного curl на /ping

## Команда
```bash
curl -v http://localhost:8080/ping
```

## Результат
```
*   Trying 127.0.0.1:8080...
* Connected to 127.0.0.1 (127.0.0.1) port 8080 (#0)
> GET /ping HTTP/1.1
> Host: localhost:8080
> User-Agent: curl/7.88.1
> Accept: */*
> 
< HTTP/1.1 200 OK
< Date: Fri, 29 Aug 2025 18:04:31 GMT
< Content-Length: 4
< Content-Type: text/plain; charset=utf-8
< 
* Connection #0 to host localhost (127.0.0.1) left intact
pong
```

## Статус
- HTTP Status: 200 OK
- Response: pong
- Endpoint: /ping работает корректно
- Port-forward: настроен и функционирует

## Вывод
Сервис booking-service успешно отвечает на HTTP запросы через port-forward.
Endpoint /ping возвращает ожидаемый ответ "pong" со статусом 200 OK.
