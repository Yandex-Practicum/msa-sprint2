import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.3"
      import: ["@key", "@shareable"]
    )

  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Float @shareable
    hotel: Hotel
  }

  type Hotel @key(fields: "id", resolvable: false) {
    id: ID!
  }

  type Query {
    bookingsByUser(userId: String!): [Booking!]!
    booking(id: ID!): Booking
  }
`;

function headerUserId(req) {
  const h = req?.headers;
  if (!h) return undefined;
  if (typeof h.get === 'function') {
    return h.get('userid') ?? h.get('userid'.toLowerCase());
  }
  return h.userid ?? h.userId;
}

function loadGrpcClient() {
  const target = process.env.BOOKING_GRPC_URL;
  if (!target) return null;
  const def = protoLoader.loadSync(join(__dirname, 'booking.proto'), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const booking = grpc.loadPackageDefinition(def).booking;
  return new booking.BookingService(
    target,
    grpc.credentials.createInsecure(),
    { 'grpc.keepalive_time_ms': 30_000 }
  );
}

const grpcClient = loadGrpcClient();

function listBookingsGrpc(userId) {
  return new Promise((resolve, reject) => {
    if (!grpcClient) {
      resolve(mockBookings(userId));
      return;
    }
    grpcClient.listBookings({ user_id: userId ?? '' }, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(
        (res.bookings || []).map((b) => ({
          id: String(b.id),
          userId: b.user_id,
          hotelId: b.hotel_id,
          promoCode: b.promo_code || null,
          discountPercent: b.discount_percent,
        }))
      );
    });
  });
}

function mockBookings(userId) {
  return [
    {
      id: 'b1',
      userId,
      hotelId: 'h1',
      promoCode: 'SUMMER',
      discountPercent: 20,
    },
  ];
}

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      const uid = headerUserId(req);
      console.log('[booking-subgraph] bookingsByUser', { userId, headerUserId: uid || null });
      if (!uid || uid !== userId) {
        return [];
      }
      try {
        return await listBookingsGrpc(userId);
      } catch (e) {
        console.error('bookingsByUser gRPC error', e.message);
        return [];
      }
    },
    booking: async (_, { id }, { req }) => {
      const uid = headerUserId(req);
      if (!uid) return null;
      try {
        const rows = await listBookingsGrpc(uid);
        return rows.find((b) => b.id === id) ?? null;
      } catch (e) {
        console.error('booking gRPC error', e.message);
        return null;
      }
    },
  },
  Booking: {
    hotel: (parent) => ({ __typename: 'Hotel', id: parent.hotelId }),
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
