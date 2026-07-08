import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

// Загрузить proto файл
const packageDefinition = protoLoader.loadSync(
  new URL('./booking.proto', import.meta.url).pathname,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

const bookingProto = grpc.loadPackageDefinition(packageDefinition);
const BookingService = bookingProto.booking.BookingService;

// Создать gRPC client
const client = new BookingService(
  'booking-service:9090',
  grpc.credentials.createInsecure()
);

// Helper функция для вызова gRPC
const callGrpcMethod = (method, request) => {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) {
        console.error(`❌ gRPC error in ${method}:`, err);
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
};

const typeDefs = gql`
  schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])
  {
    query: Query
  }

  enum BookingStatus {
    PENDING
    CONFIRMED
    CANCELLED
  }

  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Float
    price: Float
    checkIn: String
    checkOut: String
    status: BookingStatus
    createdAt: String
    hotel: Hotel
  }

  type Hotel @key(fields: "id") {
    id: ID!
  }

  type Query {
    userBookings(userId: String!): [Booking!]!
    booking(id: ID!): Booking
  }
`;

const resolvers = {
  Query: {
    userBookings: async (_, { userId }, { req }) => {
      // ACL проверка
      const authUserId = req.headers.userid;

      if (!authUserId || authUserId !== userId) {
        console.log(`🚫 ACL DENIED: authUserId=${authUserId}, requestedUserId=${userId}`);
        return [];
      }

      try {
        console.log(`📞 Calling gRPC ListBookings for userId: ${userId}`);
        const response = await callGrpcMethod('ListBookings', { user_id: userId });

        console.log(`✅ Got ${response.bookings?.length || 0} bookings from gRPC`);

        // Преобразовать gRPC ответ в GraphQL формат
        return (response.bookings || []).map(booking => ({
          id: booking.id,
          userId: booking.user_id,
          hotelId: booking.hotel_id,
          promoCode: booking.promo_code || null,
          discountPercent: parseFloat(booking.discount_percent) || 0,
          price: parseFloat(booking.price) || 0,
          checkIn: booking.check_in || null,
          checkOut: booking.check_out || null,
          status: 'CONFIRMED',
          createdAt: booking.created_at,
        }));
      } catch (error) {
        console.error('❌ Error fetching bookings from gRPC:', error.message);
        return [];
      }
    },

    booking: async (_, { id }) => {
      console.log(`📖 Fetching booking by ID: ${id}`);
      // TODO: implement get single booking from gRPC
      return null;
    },
  },
  Booking: {
    __resolveReference: async ({ id }) => {
      // Federation reference resolution
      console.log(`📖 Resolving Booking reference for id: ${id}`);
      return { id };
    },
    hotel: async (booking) => {
      // Ссылка на отель
      return { id: booking.hotelId };
    },
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
  console.log('🔌 Connected to booking-service at booking-service:9090');
});
