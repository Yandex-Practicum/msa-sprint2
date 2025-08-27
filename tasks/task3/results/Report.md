### Изменения для задачи GraphQL Federation
1. TypeDefs (booking-subgraph): добавлено поле hotel: Hotel для связи с подграфом hotel-subgraph
2. В Query.bookingsByUser реализован ACL по userId через передачу хедеров
3. Добавлены REST-запросы к API-сервису booking-service через монолит (из Task2)
4. В __resolveReference также реализованы REST-запросы для получения сведений об отеле (api/hotels/:id)
5. Booking.hotel возвращает {__typename: "Hotel", id: booking.hotelId} для того, чтобы гейтвей подтянул данные из hotel-subgraph
6. Query.hotelsByIds возвращает делает последовательные REST-запросы по массиву ids
7. Добавлен buildService, чтобы прокидывать userId из заголовков в сабграфы