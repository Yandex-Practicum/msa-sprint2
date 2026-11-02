@startuml
!include <C4/C4_Container>

!$ELEMENT_FONT_SIZE = 10
!$ELEMENT_FONT_COLOR = "#000000"
!$TECH_FONT_SIZE = 8
!$TECH_FONT_COLOR = "#666666"
!$DESCR_FONT_SIZE = 9

!$PERSON_ICON_SIZE = 32
!$SYSTEM_ICON_SIZE = 32
!$EXTERNAL_SYSTEM_ICON_SIZE = 32
!$ICON_SIZE = 32

title C4 Container — Hotelio (монолит)

Person(user, "Пользователь", "Просматривает отели, создаёт бронирования, оставляет отзывы")

System_Boundary(hotelio, "Hotelio") {
Container(web, "Веб-портал", "React", "UI для просмотра отелей, бронирования и отзывов")
Container(api, "Hotelio API", "Java, Spring Boot", "Единое монолитное приложение: REST API и вся бизнес-логика (booking, users, hotels, promos, reviews)")
ContainerDb(db, "База данных Hotelio", "PostgreSQL", "Хранит app_user, booking, hotel, promo_code, review")
}

Rel(user, web, "Использует", "HTTPS")
Rel(web, api, "Вызывает REST API", "JSON/HTTPS")
Rel(api, db, "Читает и записывает данные", "JDBC")
@enduml