import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import { GraphQLError } from 'graphql';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const GRPC_HOST = process.env.GRPC_BOOKING_HOST || 'booking-service';
const GRPC_PORT = process.env.GRPC_BOOKING_PORT || '9090';

const typeDefs = gql`
  enum BookingStatus {
    CONFIRMED
    CANCELED
    PENDING
  }

  type Booking @key(fields: "id") {
    id: ID!
    userId: ID!
    hotelId: ID!
    promoCode: String
    discountPercent: Float!
    checkIn: String!
    checkOut: String!
    status: BookingStatus!
  }

  type Query {
    userBookings(userId: ID!): [Booking!]!
    booking(id: ID!): Booking
    bookingsByUser(userId: ID!): [Booking!]!
  }
`;

const protoOptions = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
const packageDef = protoLoader.loadSync('./proto/booking.proto', protoOptions);
const bookingProto = grpc.loadPackageDefinition(packageDef).booking;
const client = new bookingProto.BookingService(
  `${GRPC_HOST}:${GRPC_PORT}`,
  grpc.credentials.createInsecure(),
);

function listBookingsByUser(userId) {
  return new Promise((resolve, reject) => {
    client.ListBookings(
      { userId },
      { deadline: Date.now() + 10000 },
      (err, res) => {
        if (err) {
          console.error(`[booking-subgraph] gRPC ListBookings error: ${err.message}`);
          reject(new Error(`booking-service unreachable (gRPC): ${err.message}`));
          return;
        }
        const list = (res && res.bookings) || [];
        console.log(
          `[booking-subgraph] gRPC ListBookings(userId='${userId}') -> ${list.length} бронирований`,
        );
        resolve(
          list.map((b) => ({
            id: String(b.id || ''),
            userId: String(b.userId || ''),
            hotelId: String(b.hotelId || ''),
            promoCode:
              b.promoCode && String(b.promoCode).length ? String(b.promoCode) : null,
            discountPercent: Number(b.discountPercent || 0),
            createdAt: b.createdAt || new Date().toISOString(),
          })),
        );
      },
    );
  });
}

function toBooking(rec) {
  const date = new Date(rec.createdAt);
  const checkIn = date.toISOString().slice(0, 10);
  const checkOut = new Date(date.getTime() + 3 * 86400000).toISOString().slice(0, 10);
  return {
    id: rec.id,
    userId: rec.userId,
    hotelId: rec.hotelId,
    promoCode: rec.promoCode,
    discountPercent: rec.discountPercent,
    checkIn,
    checkOut,
    status: 'CONFIRMED',
  };
}

function assertSameUser(req, userId) {
  const headerUser = req && req.headers && req.headers['userid'];
  if (!headerUser || !userId) {
    throw new GraphQLError('Forbidden: header userid is required', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  if (String(headerUser).trim().toLowerCase() !== String(userId).trim().toLowerCase()) {
    throw new GraphQLError(
      `Forbidden: user '${headerUser}' cannot access bookings of '${userId}'`,
      { extensions: { code: 'FORBIDDEN' } },
    );
  }
}

const resolvers = {
  Query: {
    userBookings: async (_, { userId }, { req }) => {
      assertSameUser(req, userId);
      const list = await listBookingsByUser(userId);
      return list.map(toBooking);
    },
    bookingsByUser: async (_, { userId }, { req }) => {
      assertSameUser(req, userId);
      const list = await listBookingsByUser(userId);
      return list.map(toBooking);
    },
    booking: async (_, { id }, { req }) => {
      if (!req || !req.headers || !req.headers['userid']) {
        throw new GraphQLError('Forbidden: header userid is required', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      const all = await listBookingsByUser('');
      const found = all.find((b) => String(b.id) === String(id));
      if (!found) return null;
      assertSameUser(req, found.userId);
      return toBooking(found);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => ({ req }),
}).then(({ url }) => {
  console.log(`[booking-subgraph] ready at ${url}`);
});