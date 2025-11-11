import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
    status: String
    price: Float
    createdAt: String
    hotel: Hotel
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }

  type Hotel @key(fields: "id") {
    id: ID!
  }
`;

// Загрузка proto для gRPC (proto/booking.proto из task2; скопируйте в subgraph)
const packageDef = protoLoader.loadSync('./proto/booking.proto');
const grpcObj = grpc.loadPackageDefinition(packageDef);
const client = new grpcObj.booking.BookingService(
    'booking-service:9090',
    grpc.credentials.createInsecure()
);

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      console.log('Все заголовки запроса:', req.headers);

      const userid = req.headers['userid'];
      if (!userid) throw new Error('Unauthorized: userid header required');

      console.log(`Запрашиваем бронирования для userId: ${userId}`); // Логируем userId

      return new Promise((resolve, reject) => {
        client.ListBookings({ userId: userId }, (err, response) => {
          console.log('Получен gRPC ответ:', response); // Логируем весь ответ
          console.log('Получена gRPC ошибка (если есть):', err); // Логируем ошибку

          if (err) {
            console.error('gRPC ошибка при вызове ListBookings:', err);
            // Важно: отклоняем промис в случае gRPC ошибки
            reject(new Error(`gRPC Error: ${err.details || err.message}`));
            return; // Прерываем выполнение
          }

          // Проверяем структуру ответа
          if (!response || !response.bookings) {
            console.warn('gRPC сервер вернул ответ без поля bookings:', response);
            // Возвращаем пустой массив, если поле bookings отсутствует
            resolve([]);
            return; // Прерываем выполнение
          }

          const bookings = (response.bookings || []).map(b => ({
            ...b,
            status: b.status || 'pending'
          }));
          resolve(bookings);
        });
      });
    },
  },
  Booking: {
    __resolveReference: async (booking) => {
      return new Promise((resolve, reject) => {
        client.GetBooking({ id: booking.id }, (err, response) => {  // Добавьте GetBooking в proto если нужно
          if (err) reject(err);
          resolve(response || null);
        });
      });
    },
    hotel: (booking) => ({ __typename: 'Hotel', id: booking.hotelId }),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => ({ req }),
}).then(() => {
  console.log('✅ Booking subgraph ready at http://localhost:4001/');
});