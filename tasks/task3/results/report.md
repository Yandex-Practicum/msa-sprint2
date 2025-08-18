1. В файл docker-compose.yml добалены сервисы `booking-service` и `hotel-service`.
2. В файл docker-compose.yml добавлен сеть hotelio-net.
3. Добавлены контейнеры баз данных для `booking-service` и `hotel-service`.
4. Созданы сервисы `booking-service` и `hotel-service`, связанные с сервисами
   `booking-subgraph` и `hotel-subgraph` посредством gRPC.
5. В сервис `booking-subgraph` добавлены класс `RESTDataSource` и аргумент `datasources`
   в конструктор класса `ApolloServer`.
6. Заглушки в сервисах `booking-subgraph` и `hotel-subgraph` заменены на вызовы к сервисам
   `booking-service` и `hotel-service`.