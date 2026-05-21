import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import DataLoader from 'dataloader';

// Моковые данные об отелях
const hotelsData = [
  {
    id: '1',
    name: 'Grand Plaza Hotel',
    address: '123 Broadway, New York, NY 10001',
    city: 'New York',
    country: 'USA',
    stars: 5,
    description: 'Luxury hotel in the heart of Manhattan',
    amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Gym', 'Conference Center'],
    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945'],
    rating: 4.8,
    reviewsCount: 2345
  },
  {
    id: '2',
    name: 'Seaside Resort Miami',
    address: '456 Ocean Drive, Miami Beach, FL 33139',
    city: 'Miami',
    country: 'USA',
    stars: 4,
    description: 'Beautiful beachfront resort with stunning ocean views',
    amenities: ['WiFi', 'Pool', 'Restaurant', 'Beach Access', 'Bar', 'Spa'],
    images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd'],
    rating: 4.5,
    reviewsCount: 1892
  },
  {
    id: '3',
    name: 'Mountain View Lodge',
    address: '789 Alpine Way, Denver, CO 80202',
    city: 'Denver',
    country: 'USA',
    stars: 3,
    description: 'Cozy lodge with breathtaking mountain views',
    amenities: ['WiFi', 'Restaurant', 'Hiking Trails', 'Fireplace', 'Parking'],
    images: ['https://images.unsplash.com/photo-1454391304352-2bf4678b1a7a'],
    rating: 4.2,
    reviewsCount: 756
  },
  {
    id: '4',
    name: 'Sunset Beach Hotel',
    address: '321 Sunset Blvd, Santa Monica, CA 90401',
    city: 'Los Angeles',
    country: 'USA',
    stars: 4,
    description: 'Modern hotel steps away from the beach',
    amenities: ['WiFi', 'Pool', 'Restaurant', 'Rooftop Bar', 'Gym'],
    images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e'],
    rating: 4.6,
    reviewsCount: 1543
  },
  {
    id: '5',
    name: 'Downtown Chicago Hotel',
    address: '555 Michigan Ave, Chicago, IL 60611',
    city: 'Chicago',
    country: 'USA',
    stars: 4,
    description: 'Luxury hotel in the heart of downtown',
    amenities: ['WiFi', 'Pool', 'Restaurant', 'Business Center', 'Spa'],
    images: ['https://images.unsplash.com/photo-1551632811-561732d1e306'],
    rating: 4.7,
    reviewsCount: 2100
  }
];

// Кеш для отелей (in-memory cache)
const hotelCache = new Map();

// DataLoader для батчинга запросов (решение проблемы N+1)
class HotelDataLoader {
  static getLoader() {
    return new DataLoader(async (ids) => {
      console.log(`📦 BATCH LOADING: Загрузка ${ids.length} отелей за ОДИН запрос. IDs:`, ids);

      const results = [];
      const missingIds = [];

      // Проверяем кеш
      for (const id of ids) {
        if (hotelCache.has(id)) {
          console.log(`✅ CACHE HIT: Отель ${id} найден в кеше`);
          results.push(hotelCache.get(id));
        } else {
          missingIds.push(id);
          results.push(null);
        }
      }

      // Загружаем недостающие отели
      if (missingIds.length > 0) {
        console.log(`🔄 BATCH: Загружаем из источника ${missingIds.length} отелей`);

        // Создаем Map для быстрого поиска
        const hotelsMap = new Map();
        hotelsData.forEach(hotel => {
          hotelsMap.set(hotel.id, hotel);
        });

        // Заполняем результаты
        for (let i = 0; i < missingIds.length; i++) {
          const id = missingIds[i];
          const hotel = hotelsMap.get(id);

          if (hotel) {
            // Сохраняем в кеш
            hotelCache.set(id, hotel);
            const index = ids.findIndex(originalId => originalId === id);
            results[index] = hotel;
            console.log(`✅ Загружен отель ${id}: ${hotel.name}`);
          } else {
            console.log(`❌ Отель ${id} не найден`);
          }
        }
      }

      console.log(`✅ BATCH COMPLETE: Возвращено ${results.filter(r => r !== null).length} отелей`);
      return results;
    });
  }
}

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.5",
          import: ["@key", "@shareable", "@external", "@requires"])

  # Расширяем тип Booking из booking-subgraph
  extend type Booking @key(fields: "id") {
    id: ID! @external
    hotelId: ID! @external
    hotel: Hotel @requires(fields: "hotelId")
  }

  type Hotel @key(fields: "id") {
    id: ID!
    name: String
    address: String
    city: String
    country: String
    stars: Int
    description: String
    amenities: [String!]!
    images: [String!]!
    rating: Float
    reviewsCount: Int
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]!
    hotel(id: ID!): Hotel
    hotels(city: String, minStars: Int): [Hotel!]!
  }
`;

const resolvers = {
  Query: {
    // Батчевый запрос нескольких отелей по ID
    hotelsByIds: async (_, { ids }, { hotelLoader }) => {
      console.log(`🔍 QUERY hotelsByIds: Запрос ${ids.length} отелей`);
      return await hotelLoader.loadMany(ids);
    },

    // Получение одного отеля (использует тот же DataLoader)
    hotel: async (_, { id }, { hotelLoader }) => {
      console.log(`🔍 QUERY hotel: Запрос отеля ${id} через DataLoader`);
      return await hotelLoader.load(id);
    },

    // Поиск отелей по критериям
    hotels: async (_, { city, minStars }) => {
      console.log(`🔍 QUERY hotels: Поиск отелей city=${city}, minStars=${minStars}`);

      let results = [...hotelsData];

      if (city) {
        results = results.filter(hotel =>
          hotel.city.toLowerCase().includes(city.toLowerCase())
        );
      }

      if (minStars) {
        results = results.filter(hotel => hotel.stars >= minStars);
      }

      console.log(`✅ QUERY hotels: Найдено ${results.length} отелей`);
      return results;
    }
  },

  Hotel: {
    // Federation: резолвим Hotel по ID (используется когда запрашивают hotel { ... } внутри booking)
    __resolveReference: async (reference, { hotelLoader }) => {
      console.log(`🔄 __resolveReference: Запрос отеля ${reference.id} через DataLoader (батчинг!)`);

      if (!reference.id) {
        console.error('❌ __resolveReference: Нет id в reference');
        return null;
      }

      return await hotelLoader.load(reference.id);
    }
  },

  // КЛЮЧЕВОЙ РЕЗОЛВЕР: добавляем поле hotel к типу Booking
  Booking: {
    hotel: async (booking, _, { hotelLoader }) => {
      console.log(`🏨 RESOLVING HOTEL: Booking ${booking.id} запрашивает отель ${booking.hotelId}`);

      if (!booking.hotelId) {
        console.log(`❌ Нет hotelId для бронирования ${booking.id}`);
        return null;
      }

      const hotel = await hotelLoader.load(booking.hotelId);
      console.log(`✅ Отель ${booking.hotelId} загружен: ${hotel?.name || 'не найден'}`);
      return hotel;
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
  context: async () => {
    // Создаем НОВЫЙ DataLoader для КАЖДОГО запроса
    return {
      hotelLoader: HotelDataLoader.getLoader()
    };
  },
}).then(({ url }) => {
  console.log(`✅ Hotel subgraph ready at ${url}`);
  console.log(`📊 Загружено отелей в БД: ${hotelsData.length}`);
  console.log(`⚡ DataLoader + кеширование включены! Проблема N+1 решена!`);
});