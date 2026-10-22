import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLError } from 'graphql';
import gql from 'graphql-tag';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const proto = grpc.loadPackageDefinition(protoLoader.loadSync('booking.proto')).booking;
const client = new proto.BookingService(process.env.BOOKING_GRPC || 'booking-service:9090', grpc.credentials.createInsecure());
const listBookings = (userId) => new Promise((ok, fail) =>
  client.ListBookings({ userId }, (err, res) => (err ? fail(err) : ok(res.bookings))));

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
    hotel: Hotel
  }

  extend type Hotel @key(fields: "id") {
    id: ID! @external
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

const checkAcl = (req, userId) => {
  const caller = req.headers['userid'];
  if (!caller || caller !== userId) {
    console.log(`ACL deny: header userid=${caller}, requested userId=${userId}`);
    throw new GraphQLError('Access denied', { extensions: { code: 'FORBIDDEN' } });
  }
};

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      checkAcl(req, userId);
      const bookings = await listBookings(userId);
      console.log(`bookingsByUser(${userId}) -> ${bookings.length} bookings`);
      return bookings;
    },
  },
  Booking: {
    __resolveReference: async ({ id }, { req }) => {
      const userId = req.headers['userid'];
      if (!userId) return null;
      return (await listBookings(userId)).find((b) => b.id === id) || null;
    },
    discountPercent: (b) => Math.round(b.discountPercent || 0),
    promoCode: (b) => b.promoCode || null,
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
