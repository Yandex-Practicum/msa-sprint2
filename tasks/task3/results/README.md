hotel-subgraph:
1) Были реализованы __resolveReference, hotelsByIds методы через REST вызовы в монолит

booking-subgraph:
1) Добавил grpc климент к booking-service
2) Реализовал bookingsByUser и внедрил ACL проверкуф
3) Реализовал метод получения hotel

gateway:
1) Изменил пути сервисов на внутренние адреса docker (через env)
2) Починил прокидывание хедера