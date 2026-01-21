Объяснение стратегии миграции данных при запуске нового сервиса и стратегии To Be.

- запрос из монолита на создание бронирования вызывает Grpc-сервис в новом сервисе
- в новом сервисе создается бронирование и сохраняется в БД микросервиса
- это же бронирование должно сохраняться в БД монолита в Grpc-сервисе монолита, но там отсутствует вызов сохранения bookingRepository.save(booking)

Вопросы:
1. Не хватает вызова bookingRepository.save(booking) в GrpcBookingService в монолите?
2. Про листинг бронирований, вызванный через REST из монолита и GRPC из микросервиса:

В задании сказано: Запрос списка бронирований в монолите работает так же, как раньше, — будет убран другой командой позже. 

Но он так не работает: сейчас он вызывает Grpc-сервис, а в нем 
public GrpcBookingService(BookingServiceGrpc.BookingServiceBlockingStub stub) {
        super((BookingRepository)null, (PromoCodeService)null, (ReviewService)null, (AppUserService)null, (HotelService)null);
        logger.info("Using GRPC BookingService");
        this.stub = stub;
    }

    public List<Booking> listAll(String userId) {
        BookingListRequest request = BookingListRequest.newBuilder().setUserId(userId).build();
        BookingListResponse response = this.stub.listBookings(request);
        return response.getBookingsList().stream().map(this::toBooking).toList();
    }

    и происходит ошибка
    2026-01-21T07:13:26.799Z ERROR 1 --- [nio-8080-exec-1] o.a.c.c.C.[.[.[/].[dispatcherServlet]    : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed: java.lang.NullPointerException: Cannot invoke "com.hotelio.monolith.repository.BookingRepository.findAll()" because "this.bookingRepository" is null] with root cause


java.lang.NullPointerException: Cannot invoke "com.hotelio.monolith.repository.BookingRepository.findAll()" because "this.bookingRepository" is null

	at com.hotelio.monolith.service.BookingService.listBookings(BookingService.java:39) ~[!/:1.0.0]

	at com.hotelio.monolith.controller.BookingController.listBookings(BookingController.java:23) ~[!/:1.0.0]