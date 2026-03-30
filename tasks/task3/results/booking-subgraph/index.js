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

// gRPC client for booking-service (task2)
const PROTO_PATH = path.resolve(__dirname, 'booking.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const bookingPkg = grpc.loadPackageDefinition(packageDef).booking;
const BOOKING_GRPC_ADDR = process.env.BOOKING_GRPC_ADDR || 'booking-service:9090';
const bookingClient = new bookingPkg.BookingService(BOOKING_GRPC_ADDR, grpc.credentials.createInsecure());

const typeDefs = gql`
  extend type Hotel @key(fields: "id") { id: ID! }

  type Booking @key(fields: "id") {
    id: ID!
    userId: ID!
    hotelId: ID!
    promoCode: String
    discountPercent: Float
    hotel: Hotel
  }

  type Query {
    bookingsByUser(userId: ID!): [Booking!]!
  }
`;

function listBookingsByUser(userId) {
  return new Promise((resolve, reject) => {
    bookingClient.ListBookings({ user_id: userId }, (err, resp) => {
      if (err) return reject(err);
      resolve(resp?.bookings || []);
    });
  });
}

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      const requester = req?.headers?.['userid'] || req?.headers?.['userId'] || req?.headers?.['user-id'];
      if (!requester || String(requester) !== String(userId)) {
        console.log(`[ACL] Deny: requester=${requester} tried to access userId=${userId}`);
        return [];
      }
      console.log(`[ACL] Allow: userId=${userId}`);
      const rows = await listBookingsByUser(String(userId));
      return rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        hotelId: r.hotel_id,
        promoCode: r.promo_code || null,
        discountPercent: typeof r.discount_percent === 'number' ? r.discount_percent : 0,
      }));
    },
  },
  Booking: {
    hotel: (b) => ({ __typename: 'Hotel', id: b.hotelId }),
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






