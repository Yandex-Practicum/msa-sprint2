# Задание 3: Личный кабинет с GraphQL Federation

## Описание проекта

Реализация федеративного GraphQL API для личного кабинета Hotelio с использованием Apollo Federation. Система состоит из трех модулей:

1. **booking-subgraph** - управление бронированиями с ACL
2. **hotel-subgraph** - информация об отелях
3. **apollo-gateway** - агрегация схем и проксирование запросов

## Архитектура

```
Frontend -> Apollo Gateway (4000) -> [Federation] -> Subgraphs
                                    ├── Booking (4001)
                                    └── Hotel (4002)
```

## Запуск

### Предварительные требования
- Docker и Docker Compose
- Сеть `hotelio-net` должна быть создана

### Создание сети
```bash
docker network create hotelio-net
```

### Запуск всех сервисов
```bash
cd task3
docker compose up -d --build
```

## Доступные endpoints

- **Apollo Gateway**: http://localhost:4000
- **GraphQL Playground**: http://localhost:4000
- **Booking Subgraph**: http://localhost:4001
- **Hotel Subgraph**: http://localhost:4002

## Тестирование

### GraphQL запрос
```graphql
query {
  bookingsByUser(userId: "user1") {
    id
    hotel {
      name
      city
    }
    discountPercent
  }
}
```

### Заголовки для ACL
```
userid: user1
```

## Особенности реализации

### ACL (Access Control List)
- Пользователь может видеть только свои бронирования
- Проверка через заголовок `userid`
- Ошибка 403 при попытке доступа к чужим данным

### Интеграция с существующими сервисами
- Booking subgraph подключается к PostgreSQL БД
- Hotel subgraph использует REST API монолита
- Все сервисы работают в одной Docker сети

### Federation
- Используется Apollo Federation 2
- Автоматическое объединение схем
- Поддержка `__resolveReference` для связей между типами
