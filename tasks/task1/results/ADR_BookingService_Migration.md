# ADR: Выделение BookingService из монолита Hotelio в отдельный микросервис

## Функциональные требования

| № | Действующие лица или системы | Use Case                             | Описание                                                                                                                                                                                      |
|---|------------------------------|--------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | Пользователь                 | Создание бронирования                | Пользователь отправляет запрос через API Gateway; BookingService оркестрирует проверку пользователя, отеля, промокода и репутации отеля, рассчитывает финальную цену и сохраняет бронирование |
| 2 | BookingService               | Проверка статуса пользователя        | BookingService через Anti-Corruption Layer вызывает UserService в монолите для проверки активности и блэклиста                                                                                |
| 3 | BookingService               | Проверка отеля                       | BookingService через ACL вызывает HotelService для получения данных отеля и валидации доступности                                                                                             |
| 4 | BookingService               | Применение промокода                 | BookingService через ACL вызывает PromoCodeService для проверки и применения скидки                                                                                                           |
| 5 | BookingService               | Проверка репутации                   | BookingService через ACL вызывает ReviewService, чтобы заблокировать бронирование при низком рейтинге отеля                                                                                   |
| 6 | Партнёрский канал            | Создание бронирования через партнёра | Внешние агрегаторы используют тот же API Gateway и маршрутизируются на новый BookingService                                                                                                   |

## Нефункциональные требования

| № | Требование                                                                                                       |
|---|------------------------------------------------------------------------------------------------------------------|
| 1 | Независимое масштабирование BookingService при пиковых нагрузках без влияния на остальные модули монолита        |
| 2 | Возможность мгновенного rollback трафика на монолит при сбоях нового сервиса (canary release)                    |
| 3 | Отсутствие простоя (zero downtime) при переключении трафика бронирования                                         |
| 4 | Изоляция данных бронирований в собственной БД (Database per Service) для последующего переезда в облако          |
| 5 | ACL не должен вносить более 50 мс дополнительной латентности на вызов зависимого сервиса монолита                |
| 6 | Согласованность данных между новой Booking DB и монолитной БД в переходный период (dual-write без потери данных) |
| 7 | Наблюдаемость: метрики (latency, error rate) и трассировка запросов бронирования с первого дня эксплуатации      |

## Решение

### Диаграмма контекста

```plantuml
@startuml
!includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

Person(user, "Пользователь", "Ищет и бронирует отели")
System_Ext(partner, "Партнёрские каналы", "Внешние booking-агрегаторы")

System_Boundary(hotelio, "Hotelio Platform") {
  System(gateway, "API Gateway / Strangler Facade", "Роутинг между монолитом и новым сервисом")
  System(bookingSvc, "Booking Service", "Новый выделенный микросервис бронирования")
  System(monolith, "Hotelio Monolith", "Legacy: User, Hotel, Promo, Review")
}

Rel(user, gateway, "HTTPS")
Rel(partner, gateway, "HTTPS")
Rel(gateway, bookingSvc, "Проксирует /api/bookings")
Rel(gateway, monolith, "Проксирует /api/hotels, /api/users, /api/promos, /api/reviews")
Rel(bookingSvc, monolith, "Синхронные вызовы через ACL")
@enduml
```

### Диаграмма контейнеров

```plantuml
@startuml
!includeurl https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

Person(user, "Пользователь")

System_Boundary(hotelio, "Hotelio Platform") {
  Container(gateway, "API Gateway", "Spring Cloud Gateway", "Strangler Facade: роутит /api/bookings в новый сервис, остальное — в монолит")

  Container(bookingSvc, "Booking Service", "Spring Boot", "Оркестрация бронирования, расчёт цены")
  ContainerDb(bookingDb, "Booking DB", "PostgreSQL (отдельная схема/инстанс)", "bookings, booking_status")

  Container(acl, "Anti-Corruption Layer", "REST/gRPC клиент внутри Booking Service", "Транслирует вызовы к монолиту без утечки его модели данных")

  Container(monolith, "Monolith", "Spring Boot", "User, Hotel, Promo, Review контроллеры и сервисы")
  ContainerDb(monolithDb, "Monolith DB", "PostgreSQL", "users, hotels, reviews, promos")

  Container(kafka, "Kafka", "Apache Kafka", "Публикация booking.created для будущей асинхронной интеграции")
}

Rel(user, gateway, "HTTPS")
Rel(gateway, bookingSvc, "/api/bookings")
Rel(gateway, monolith, "/api/hotels, /api/users, /api/promos, /api/reviews")
Rel(bookingSvc, acl, "Uses")
Rel(acl, monolith, "REST: getUserStatus, getHotel, applyPromo, checkReviews")
Rel(bookingSvc, bookingDb, "Reads/Writes")
Rel(monolith, monolithDb, "Reads/Writes")
Rel(bookingSvc, kafka, "Публикует booking.created")
@enduml
```

### Обоснование выбора технологий и подхода

- **API Gateway как Strangler Facade** позволяет маршрутизировать трафик по URL-паттерну без изменения клиентских интеграций и обеспечивает canary-переключение.
- **Anti-Corruption Layer** внутри BookingService изолирует зависимости от модели данных монолита — при последующем выносе User/Hotel/Promo/Review сервисов достаточно заменить реализацию адаптера, не трогая бизнес-логику оркестрации.
- **Собственная Booking DB** реализует Database per Service с первого дня, избегая повторной миграции схемы данных в будущем.
- **Kafka (booking.created)** закладывает фундамент для перехода к событийной архитектуре согласно годовой цели (Service mesh, GraphQL, трассировка на каждый сервис).

## Почему первым мигрируется BookingService

BookingService — точка входа и оркестратор, через который проходит весь revenue-critical трафик (создание бронирования), поэтому именно его масштабирование даёт наибольший бизнес-эффект при пиковых нагрузках. Best practice Strangler Fig допускает начинать с компонента с наибольшими требованиями к масштабируемости и наиболее частыми изменениями, а не только с "безопасного" низкорискового модуля.

## План миграции (Strangler Fig)

1. **Facade**: развернуть API Gateway перед монолитом, все запросы идут как passthrough без изменения поведения.
2. **Anti-Corruption Layer**: выделить клиентские интерфейсы к User/Hotel/Promo/Review внутри монолита как чёткий контракт, который будет использовать новый BookingService.
3. **Разработка сервиса**: реализовать BookingService с собственной БД (таблица bookings), перенести бизнес-логику расчёта цены и оркестрации, покрыть контрактными тестами совместимости API.
4. **Дублирование трафика (shadow mode)**: Gateway отправляет копию запросов на новый сервис для сверки результата расчёта цены без влияния на пользователя.
5. **Canary-переключение**: постепенно переводить `/api/bookings` на новый сервис (5% → 25% → 100%), мониторя метрики ошибок и латентности, с мгновенным откатом на монолит при аномалиях.
6. **Заморозка старого кода**: BookingController/Service в монолите помечаются deprecated, вся новая функциональность бронирования разрабатывается только в новом сервисе.
7. **Декомиссия**: после стабилизации удалить старый BookingService и таблицу bookings из монолитной БД, начать разделение схем для User/Hotel/Promo/Review в рамках следующего этапа.

## Альтернативы

- **Начать с PromoCodeService** как более изолированного и низкорискового модуля — отклонено, так как не даёт немедленного эффекта на главную боль бизнеса (масштабирование booking-трафика в пиках).
- **Big Bang переход на все сервисы сразу** — отклонено из-за ограниченности команды (2 Java-разработчика, 1 архитектор) и высокого риска простоя revenue-critical функциональности.
- **Прямое подключение BookingService к монолитной БД (shared database)** вместо ACL — отклонено, так как нарушает принцип независимого релиза и создаёт скрытую связанность на уровне схемы данных.

## Недостатки, ограничения, риски

- Anti-Corruption Layer добавляет сетевую задержку и потенциальную точку отказа при каждом вызове зависимых модулей монолита, что требует circuit breaker и fallback-логики (например, деградация без промокода при недоступности PromoCodeService).
- Разделение БД создаёт риск временной несогласованности данных между Booking DB и монолитной БД в период dual-write, что требует механизма сверки и идемпотентности операций.
- Ошибка в расчёте цены или логике оркестрации в новом сервисе имеет прямое финансовое влияние на бизнес, поэтому обязательны canary-rollout с постепенным увеличением трафика и мгновенный откат на монолит при аномалиях метрик.
- Команда из двух разработчиков должна параллельно поддерживать ACL-контракты и старый BookingController в режиме заморозки, что временно увеличивает нагрузку и может замедлить разработку фич в других модулях монолита.
