Паттерн Strangler Fig, заключается в том, что бы выносить сервисы с наименьшими связими, менее загруженный. 
В задании было необходимо прокировать "старые" запросы в монолит, а новые фичи делать в новом микросервисе.


Так и не получилось победить NPE при запросе от микросервиса в=к монолиту

java.lang.NullPointerException: null
2025-08-31T02:49:11.679057002Z 	at com.hotelio.proto.booking.BookingListRequest$Builder.setUserId(BookingListRequest.java:449) ~[p-o-y-1.0.0