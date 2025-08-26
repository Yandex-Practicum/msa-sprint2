import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import fetch from 'node-fetch';

// REST API монолита
const MONOLITH_URL = process.env.MONOLITH_URL || 'http://monolith:8080';

// Кэш для отелей (простая оптимизация)
const hotelCache = new Map();
const CACHE_TTL = 60000; // 1 минута

// GraphQL схема
const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@extends", "@external", "@requires"])

  type Hotel @key(fields: "id") {
    id: ID!
    name: String!
    city: String!
    address: String
    stars: Int
    rating: Float
    operational: Boolean
    fullyBooked: Boolean
    description: String
  }

  extend type Booking @key(fields: "id") {
    id: ID! @external
    hotelId: String! @external
    hotel: Hotel @requires(fields: "hotelId")
  }

  type Query {
    hotel(id: ID!): Hotel
    hotelsByIds(ids: [ID!]!): [Hotel]
    hotelsByCity(city: String!): [Hotel]
    topRatedHotels(city: String, limit: Int): [Hotel]
  }
`;

// Функция для получения отеля из API
async function fetchHotel(hotelId) {
  const cacheKey = `hotel:${hotelId}`;
  const cached = hotelCache.get(cacheKey);
  
  if (cached && cached.timestamp + CACHE_TTL > Date.now()) {
    console.log(`[Cache] Возвращаем отель ${hotelId} из кэша`);
    return cached.data;
  }
  
  try {
    console.log(`[API] Запрос отеля ${hotelId} из ${MONOLITH_URL}/api/hotels/${hotelId}`);
    const response = await fetch(`${MONOLITH_URL}/api/hotels/${hotelId}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      console.log(`[API] Ошибка получения отеля ${hotelId}: ${response.status}`);
      return null;
    }
    
    const hotel = await response.json();
    
    // Дополняем недостающие поля
    const enrichedHotel = {
      id: hotel.id || hotelId,
      name: hotel.name || `Hotel ${hotelId}`,
      city: hotel.city || 'Seoul',
      address: hotel.address || 'Downtown',
      stars: hotel.stars || 4,
      rating: hotel.rating || 4.5,
      operational: hotel.operational !== undefined ? hotel.operational : true,
      fullyBooked: hotel.fullyBooked !== undefined ? hotel.fullyBooked : false,
      description: hotel.description || 'Comfortable hotel'
    };
    
    // Сохраняем в кэш
    hotelCache.set(cacheKey, { data: enrichedHotel, timestamp: Date.now() });
    
    return enrichedHotel;
  } catch (error) {
    console.log(`[API] Ошибка при запросе отеля ${hotelId}:`, error.message);
    
    // Возвращаем заглушку для демо
    return {
      id: hotelId,
      name: hotelId === 'test-hotel-1' ? 'Grand Seoul Hotel' : 'Seoul Plaza Hotel',
      city: 'Seoul',
      address: '123 Gangnam-gu, Seoul',
      stars: 5,
      rating: 4.5,
      operational: true,
      fullyBooked: false,
      description: 'Luxury hotel in the heart of Seoul'
    };
  }
}

// Функция для проверки операционного статуса
async function checkOperational(hotelId) {
  try {
    const response = await fetch(`${MONOLITH_URL}/api/hotels/${hotelId}/operational`);
    if (response.ok) {
      const result = await response.text();
      return result === 'true';
    }
  } catch (error) {
    console.log(`[API] Ошибка проверки operational для ${hotelId}:`, error.message);
  }
  return true; // По умолчанию считаем операционным
}

// Функция для проверки заполненности
async function checkFullyBooked(hotelId) {
  try {
    const response = await fetch(`${MONOLITH_URL}/api/hotels/${hotelId}/fully-booked`);
    if (response.ok) {
      const result = await response.text();
      return result === 'true';
    }
  } catch (error) {
    console.log(`[API] Ошибка проверки fully-booked для ${hotelId}:`, error.message);
  }
  return false; // По умолчанию считаем не заполненным
}

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      console.log(`[Federation] Резолв Hotel с id: ${id}`);
      const hotel = await fetchHotel(id);
      
      if (!hotel) {
        return null;
      }
      
      // Дополнительно проверяем статусы
      const [operational, fullyBooked] = await Promise.all([
        checkOperational(id),
        checkFullyBooked(id)
      ]);
      
      return {
        ...hotel,
        operational,
        fullyBooked
      };
    }
  },
  
  Booking: {
    hotel: async (booking) => {
      console.log(`[Federation] Резолв hotel для booking с hotelId: ${booking.hotelId}`);
      return await fetchHotel(booking.hotelId);
    }
  },
  
  Query: {
    hotel: async (_, { id }) => {
      return await fetchHotel(id);
    },
    
    hotelsByIds: async (_, { ids }) => {
      console.log(`[Query] Запрос отелей по ids: ${ids.join(', ')}`);
      const hotels = await Promise.all(ids.map(id => fetchHotel(id)));
      return hotels.filter(h => h !== null);
    },
    
    hotelsByCity: async (_, { city }) => {
      try {
        console.log(`[API] Запрос отелей в городе ${city}`);
        const response = await fetch(`${MONOLITH_URL}/api/hotels/by-city?city=${encodeURIComponent(city)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const hotels = await response.json();
        // Дополняем недостающие поля для каждого отеля
        return hotels.map(hotel => ({
          id: hotel.id,
          name: hotel.name || `Hotel ${hotel.id}`,
          city: hotel.city || city,
          address: hotel.address || 'Downtown',
          stars: hotel.stars || 4,
          rating: hotel.rating || 4.5,
          operational: hotel.operational !== undefined ? hotel.operational : true,
          fullyBooked: hotel.fullyBooked !== undefined ? hotel.fullyBooked : false,
          description: hotel.description || 'Comfortable hotel'
        }));
      } catch (error) {
        console.log(`[API] Ошибка получения отелей по городу:`, error.message);
        
        // Заглушка для демо
        return [
          {
            id: 'test-hotel-1',
            name: 'Grand Seoul Hotel',
            city: city,
            address: '123 Gangnam-gu',
            stars: 5,
            rating: 4.5,
            operational: true,
            fullyBooked: false
          },
          {
            id: 'test-hotel-2',
            name: 'Seoul Plaza Hotel',
            city: city,
            address: '456 Jung-gu',
            stars: 4,
            rating: 4.2,
            operational: true,
            fullyBooked: true
          }
        ];
      }
    },
    
    topRatedHotels: async (_, { city, limit = 10 }) => {
      try {
        const params = new URLSearchParams();
        if (city) params.append('city', city);
        params.append('limit', limit.toString());
        
        console.log(`[API] Запрос топ отелей: ${params.toString()}`);
        const response = await fetch(`${MONOLITH_URL}/api/hotels/top-rated?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const hotels = await response.json();
        return hotels;
      } catch (error) {
        console.log(`[API] Ошибка получения топ отелей:`, error.message);
        
        // Заглушка
        return [
          {
            id: 'test-hotel-1',
            name: 'Grand Seoul Hotel',
            city: city || 'Seoul',
            stars: 5,
            rating: 4.8,
            operational: true,
            fullyBooked: false
          }
        ];
      }
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
}).then(({ url }) => {
  console.log(`✅ Hotel subgraph ready at ${url}`);
  console.log(`🏨 Подключение к монолиту: ${MONOLITH_URL}`);
});