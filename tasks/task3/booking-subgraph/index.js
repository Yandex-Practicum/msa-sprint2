import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import { GraphQLError } from 'graphql';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://localhost:8080';

const typeDefs = gql`
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

  extend type Hotel @key(fields: "id") {
    id: ID! @external
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
    booking(id: ID!): Booking
  }
`;

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      const requesterId = req.headers['userid'];
      if (!requesterId || requesterId !== userId) {
        throw new GraphQLError('Access denied: you can only view your own bookings', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      console.log(`[ACL] User ${requesterId} fetching bookings for userId=${userId}`);
      const res = await fetch(`${MONOLITH_URL}/api/bookings?userId=${userId}`);
      if (!res.ok) {
        console.error(`[REST] GET /api/bookings?userId=${userId} → ${res.status}`);
        return [];
      }
      const bookings = await res.json();
      console.log(`[REST] Got ${bookings.length} bookings for userId=${userId}`);
      return bookings;
    },

    booking: async (_, { id }, { req }) => {
      const requesterId = req.headers['userid'];
      if (!requesterId) {
        throw new GraphQLError('Access denied: missing userid header', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      const res = await fetch(`${MONOLITH_URL}/api/bookings?userId=${requesterId}`);
      if (!res.ok) return null;
      const bookings = await res.json();
      return bookings.find((b) => String(b.id) === String(id)) ?? null;
    },
  },

  Booking: {
    __resolveReference: async (ref) => {
      return { id: ref.id };
    },
    hotel: (booking) => {
      if (!booking.hotelId) return null;
      return { __typename: 'Hotel', id: booking.hotelId };
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
  console.log(`   Monolith URL: ${MONOLITH_URL}`);
});
