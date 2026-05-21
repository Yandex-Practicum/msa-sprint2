import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем proto файл
const PROTO_PATH = path.join(__dirname, 'proto', 'booking.proto');
const packageDefinition = await protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDefinition);

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'localhost:9090';
const client = new proto.booking.BookingService(
  BOOKING_SERVICE_URL,
  grpc.credentials.createInsecure()
);

const listBookings = (userId) => {
  return new Promise((resolve, reject) => {
    console.log(`📞 Calling gRPC ListBookings with userId: "${userId}"`);

    // Пробуем оба варианта (с учетом и без учета BigInt)
    const request = { user_id: userId };

    client.ListBookings(request, (error, response) => {
      if (error) {
        console.error('❌ gRPC error:', error);
        reject(error);
      } else {
        // Детальный лог всего ответа
        console.log('📦 Full gRPC response:', JSON.stringify(response, null, 2));
        console.log('📦 Response type:', typeof response);
        console.log('📦 Response keys:', Object.keys(response));

        // Проверяем наличие bookings
        if (response.bookings) {
          console.log(`📊 bookings is array: ${Array.isArray(response.bookings)}`);
          console.log(`📊 bookings length: ${response.bookings.length}`);

          if (response.bookings.length > 0) {
            console.log('🔍 First booking:', JSON.stringify(response.bookings[0], null, 2));
            console.log('🔍 First booking keys:', Object.keys(response.bookings[0]));
          }
        } else {
          console.log('❌ No bookings field in response!');
          console.log('Available fields:', Object.keys(response));
        }

        // Безопасный маппинг с проверкой существования полей
        const bookings = (response.bookings || []).map((booking, index) => {
          console.log(`🔄 Mapping booking ${index}:`, JSON.stringify(booking));

          return {
            id: booking.id,
            userId: booking.user_id,
            hotelId: booking.hotel_id,
            promoCode: booking.promo_code || null,
            discountPercent: booking.discount_percent || null,
            checkIn: null,
            checkOut: null,
            status: null,
          };
        });

        console.log(`✅ Mapped ${bookings.length} bookings`);
        resolve(bookings);
      }
    });
  });
};

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.5",
          import: ["@key"])

  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: ID!
    promoCode: String
    discountPercent: Float
    checkIn: String
    checkOut: String
    status: String
  }

  type Query {
    userBookings(userId: String!): [Booking]
    booking(id: ID!): Booking
  }
`;

const resolvers = {
  Query: {
    userBookings: async (_, { userId }, { currentUserId }) => {
      console.log(`🔍 userBookings called: userId=${userId}, currentUserId=${currentUserId}`);

      if (!currentUserId || currentUserId !== userId) {
        console.log(`❌ Access denied`);
        throw new Error('Access denied: You can only view your own bookings');
      }

      try {
        const bookings = await listBookings(userId);
        console.log(`✅ Found ${bookings.length} bookings for user ${userId}`);
        return bookings;
      } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
      }
    },

    booking: async (_, { id }, { currentUserId }) => {
      console.log(`🔍 booking called: id=${id}`);
      return null;
    },
  },

  Booking: {
    __resolveReference: async (reference) => {
      console.log(`🔄 Resolving booking reference: ${reference.id}`);
      return {
        id: reference.id,
        userId: reference.userId,
        hotelId: reference.hotelId,
        promoCode: reference.promoCode,
        discountPercent: reference.discountPercent,
      };
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => {
    const userId = req.headers['x-user-id'] || null;
    console.log(`📨 Booking context: x-user-id=${userId}`);
    return { currentUserId: userId };
  },
}).then(({ url }) => {
  console.log(`✅ Booking subgraph ready at ${url}`);
});