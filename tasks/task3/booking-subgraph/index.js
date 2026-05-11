import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_PATH = './booking.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const bookingProto = protoDescriptor.booking;

const grpcClient = new bookingProto.BookingService(
    process.env.BOOKING_SERVICE_URL || 'booking-service:9090',
    grpc.credentials.createInsecure()
);

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
  }

  extend type Hotel @key(fields: "id") {
    id: ID! @external
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      const currentUserId = req.headers['userid'];
      console.log(`userId from query: ${userId}`);

      if (!currentUserId || currentUserId !== userId) {
        console.log(`Access denied for user ${currentUserId}`);
        throw new Error('Forbidden');
      }

      return new Promise((resolve, reject) => {
        grpcClient.listBookings({ userId }, (error, response) => {
          if (error) {
            console.error(`[gRPC] Error: ${error.message}`);
            reject(new Error('Failed to fetch bookings'));
            return;
          }

          console.log(`[gRPC] Received ${response.bookings?.length || 0} bookings for user ${userId}`);

          const bookings = response.bookings.map(booking => ({
            id: booking.id,
            userId: booking.user_id,
            hotelId: booking.hotel_id,
            promoCode: booking.promo_code || null,
            discountPercent: booking.discount_percent || 0
          }));

          resolve(bookings);
        });
      });
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
});