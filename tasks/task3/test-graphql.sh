#!/bin/bash

echo "🧪 Тестирование GraphQL Federation"
echo ""

GRAPHQL_URL="http://localhost:4000"

# Тест 1: Запрос с правильным заголовком userid
echo "📊 Тест 1: Запрос бронирований с правильным userid заголовком"
echo "----------------------------------------------------"
curl -s -X POST ${GRAPHQL_URL} \
  -H "Content-Type: application/json" \
  -H "userid: test-user-2" \
  -d '{
    "query": "query { bookingsByUser(userId: \"test-user-2\") { id userId hotelId hotel { name city stars rating operational } promoCode discountPercent price createdAt } }"
  }' | python3 -m json.tool || echo "Результат запроса"

echo ""
echo ""

# Тест 2: Запрос БЕЗ заголовка userid (должен быть отклонен)
echo "🚫 Тест 2: Запрос без заголовка userid (ACL должен отклонить)"
echo "----------------------------------------------------"
curl -s -X POST ${GRAPHQL_URL} \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { bookingsByUser(userId: \"test-user-2\") { id userId hotelId hotel { name city } discountPercent } }"
  }' | python3 -m json.tool || echo "Результат запроса"

echo ""
echo ""

# Тест 3: Запрос с неправильным userid (попытка получить чужие данные)
echo "🔒 Тест 3: Запрос чужих данных (ACL должен вернуть пустой массив)"
echo "----------------------------------------------------"
curl -s -X POST ${GRAPHQL_URL} \
  -H "Content-Type: application/json" \
  -H "userid: test-user-1" \
  -d '{
    "query": "query { bookingsByUser(userId: \"test-user-2\") { id userId hotelId hotel { name city } discountPercent } }"
  }' | python3 -m json.tool || echo "Результат запроса"

echo ""
echo ""

# Тест 4: Запрос информации об отелях
echo "🏨 Тест 4: Запрос информации об отелях по городу"
echo "----------------------------------------------------"
curl -s -X POST ${GRAPHQL_URL} \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { hotelsByCity(city: \"Seoul\") { id name city stars rating operational fullyBooked } }"
  }' | python3 -m json.tool || echo "Результат запроса"

echo ""
echo ""

# Тест 5: Запрос топ отелей
echo "⭐ Тест 5: Запрос топ-рейтинг отелей"
echo "----------------------------------------------------"
curl -s -X POST ${GRAPHQL_URL} \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { topRatedHotels(city: \"Seoul\", limit: 3) { id name city stars rating } }"
  }' | python3 -m json.tool || echo "Результат запроса"

echo ""
echo "✅ Тестирование завершено"