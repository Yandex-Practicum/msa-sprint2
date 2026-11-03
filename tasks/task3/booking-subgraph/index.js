import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLError } from 'graphql';
import gql from 'graphql-tag';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BOOKING_SERVICE_ADDRESS = process.env.BOOKING_SERVICE_ADDRESS || 'localhost:9090';
const GRPC_DEADLINE_MS = 3000;

const protoPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'proto', 'booking.proto');
const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
  longs: String,
  defaults: true,
});
const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;
const bookingClient = new bookingProto.BookingService(BOOKING_SERVICE_ADDRESS, grpc.credentials.createInsecure());

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Float
    price: Float
    createdAt: String
    hotel: Hotel
  }

  # Отелем владеет hotel-subgraph, здесь нужна только ссылка по id
  type Hotel @key(fields: "id", resolvable: false) {
    id: ID!
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

function listBookings(userId) {
  return new Promise((resolve, reject) => {
    const deadline = new Date(Date.now() + GRPC_DEADLINE_MS);
    bookingClient.ListBookings({ user_id: userId }, { deadline }, (error, response) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(response.bookings.map(toBooking));
    });
  });
}

function toBooking(booking) {
  return {
    id: booking.id,
    userId: booking.user_id,
    hotelId: booking.hotel_id,
    promoCode: booking.promo_code || null,
    discountPercent: booking.discount_percent,
    price: booking.price,
    createdAt: booking.created_at,
  };
}

// ACL: идентичность пользователя приходит в заголовке userid (в будущем его выставит API Gateway после аутентификации).
// Без заголовка — UNAUTHENTICATED, чужие бронирования — FORBIDDEN.
function authorize(req, ownerId) {
  const requesterId = req.headers['userid'];
  if (!requesterId) {
    console.warn(`[ACL] deny: no userid header, requested bookings of ${ownerId}`);
    throw new GraphQLError('Unauthorized: userid header is required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  if (requesterId !== ownerId) {
    console.warn(`[ACL] deny: user ${requesterId} requested bookings of ${ownerId}`);
    throw new GraphQLError('Forbidden: you can see only your own bookings', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
}

function toServiceError(error) {
  console.error(`[booking-service] gRPC error: ${error.code} ${error.details || error.message}`);
  return new GraphQLError('Booking service is unavailable', {
    extensions: { code: 'SERVICE_UNAVAILABLE' },
  });
}

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      console.log(`[bookingsByUser] userId=${userId}, header userid=${req.headers['userid'] ?? '<none>'}`);
      authorize(req, userId);

      try {
        const bookings = await listBookings(userId);
        console.log(`[bookingsByUser] allow: returned ${bookings.length} bookings of ${userId}`);

        return bookings;
      } catch (error) {
        throw toServiceError(error);
      }
    },
  },
  Booking: {
    // У booking-service нет запроса брони по id, поэтому ищем среди броней запрашивающего пользователя:
    // чужая бронь в этот список не попадёт, и ACL соблюдается автоматически.
    __resolveReference: async ({ id }, { req }) => {
      const requesterId = req.headers['userid'];
      if (!requesterId) {
        console.warn(`[ACL] deny: no userid header, requested booking ${id}`);
        return null;
      }

      try {
        const bookings = await listBookings(requesterId);

        return bookings.find((booking) => booking.id === id) ?? null;
      } catch (error) {
        throw toServiceError(error);
      }
    },
    hotel: (booking) => ({ __typename: 'Hotel', id: booking.hotelId }),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  includeStacktraceInErrorResponses: false,
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => ({ req }),
}).then(() => {
  console.log(`✅ Booking subgraph ready at http://localhost:4001/ (booking-service: ${BOOKING_SERVICE_ADDRESS})`);
});
