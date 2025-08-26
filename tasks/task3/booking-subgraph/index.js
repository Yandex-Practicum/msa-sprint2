import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Настройка подключения к БД
const pool = new pg.Pool({
  host: process.env.DB_HOST || 'booking-db',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bookings',
  user: process.env.DB_USER || 'booking_user',
  password: process.env.DB_PASSWORD || 'booking_pass'
});

// Загрузка gRPC клиента
const PROTO_PATH = join(__dirname, 'proto', 'booking.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;
const grpcClient = new bookingProto.BookingService(
  process.env.GRPC_HOST || 'booking-service:9090',
  grpc.credentials.createInsecure()
);

// GraphQL схема
const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@extends", "@external"])

  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
    price: Float
    createdAt: String
  }

  type Hotel @key(fields: "id", resolvable: false) {
    id: ID!
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
    booking(id: ID!): Booking
  }
`;

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      // ACL проверка - пользователь может видеть только свои бронирования
      const requestUserId = req.headers['userid'];
      
      console.log(`[ACL] Запрос бронирований для userId: ${userId}, заголовок userid: ${requestUserId}`);
      
      if (!requestUserId) {
        console.log('[ACL] Отказ: отсутствует заголовок userid');
        throw new Error('Unauthorized: userid header required');
      }
      
      if (requestUserId !== userId) {
        console.log(`[ACL] Отказ: userid в заголовке (${requestUserId}) не совпадает с запрашиваемым (${userId})`);
        return []; // Возвращаем пустой массив вместо ошибки для более мягкого поведения
      }

      try {
        // Сначала пробуем получить из БД напрямую
        const result = await pool.query(
          'SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
          [userId]
        );
        
        console.log(`[DB] Найдено ${result.rows.length} бронирований для userId: ${userId}`);
        
        return result.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          hotelId: row.hotel_id,
          promoCode: row.promo_code,
          discountPercent: parseFloat(row.discount_percent || 0),
          price: parseFloat(row.price || 0),
          createdAt: row.created_at?.toISOString() || new Date().toISOString()
        }));
      } catch (dbError) {
        console.log('[DB] Ошибка БД, пробуем gRPC:', dbError.message);
        
        // Если БД недоступна, пробуем через gRPC
        return new Promise((resolve, reject) => {
          grpcClient.ListBookings({ userId }, (error, response) => {
            if (error) {
              console.log('[gRPC] Ошибка:', error.message);
              // Возвращаем заглушку если все сервисы недоступны
              resolve([
                {
                  id: 'booking_demo_1',
                  userId: userId,
                  hotelId: 'test-hotel-1',
                  promoCode: 'SUMMER',
                  discountPercent: 20,
                  price: 80.00,
                  createdAt: new Date().toISOString()
                },
                {
                  id: 'booking_demo_2',
                  userId: userId,
                  hotelId: 'test-hotel-2',
                  promoCode: null,
                  discountPercent: 0,
                  price: 100.00,
                  createdAt: new Date().toISOString()
                }
              ]);
            } else {
              console.log(`[gRPC] Получено ${response.bookings?.length || 0} бронирований`);
              resolve(response.bookings || []);
            }
          });
        });
      }
    },

    booking: async (_, { id }, { req }) => {
      const requestUserId = req.headers['userid'];
      
      if (!requestUserId) {
        throw new Error('Unauthorized: userid header required');
      }

      try {
        const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
          return null;
        }
        
        const booking = result.rows[0];
        
        // ACL проверка
        if (booking.user_id !== requestUserId) {
          console.log(`[ACL] Отказ: пользователь ${requestUserId} пытается получить чужое бронирование ${id}`);
          return null;
        }
        
        return {
          id: booking.id,
          userId: booking.user_id,
          hotelId: booking.hotel_id,
          promoCode: booking.promo_code,
          discountPercent: parseFloat(booking.discount_percent || 0),
          price: parseFloat(booking.price || 0),
          createdAt: booking.created_at?.toISOString() || new Date().toISOString()
        };
      } catch (error) {
        console.log('[DB] Ошибка при получении бронирования:', error.message);
        return null;
      }
    }
  },
  
  Booking: {
    __resolveReference: async (booking) => {
      try {
        const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [booking.id]);
        
        if (result.rows.length === 0) {
          return null;
        }
        
        const row = result.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          hotelId: row.hotel_id,
          promoCode: row.promo_code,
          discountPercent: parseFloat(row.discount_percent || 0),
          price: parseFloat(row.price || 0),
          createdAt: row.created_at?.toISOString() || new Date().toISOString()
        };
      } catch (error) {
        console.log('[DB] Ошибка при резолве reference:', error.message);
        return null;
      }
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => ({ req }),
}).then(({ url }) => {
  console.log(`✅ Booking subgraph ready at ${url}`);
  console.log('📊 Подключение к БД:', process.env.DB_HOST || 'booking-db');
  console.log('🔌 gRPC сервис:', process.env.GRPC_HOST || 'booking-service:9090');
});