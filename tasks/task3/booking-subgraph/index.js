import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import fetch from 'node-fetch';

const typeDefs = gql`

  type Booking @key(fields: "id") {
    hotel: Hotel
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
      const uid = req.headers.userid;
      console.log(`[Bookings] Incoming request for userId: ${userId}`);
      console.log(`[Bookings] Request headers:`, req.headers);

      if (uid !== userId || !uid) {
        console.log('[Bookings] Access denied');
        throw new Error('Access denied');
      }

      console.log(`[Bookings] Access granted for user: ${uid}`);
      const url = 'http://hotelio-monolith:8080';
      console.log(`[Bookings] Fetching bookings from ${url}/api/bookings?userId=${userId}`);

      const res = await fetch(`${url}/api/bookings?userId=${userId}`);
      if (!res.ok) {
        console.error(`[Bookings] Error fetching bookings: ${res.status} ${res.statusText}`);
        throw new Error(`Error while fetching bookings: ${res.status}`);
      }

      const bookings = await res.json();
      console.log(`[Bookings] Fetched ${bookings.length} bookings:`, bookings);

      return bookings;
    },
  },

  Booking: {
    hotel: (booking) => {
      console.log(`[Bookings] Resolving hotel for booking ${booking.id}, hotelId: ${booking.hotelId}`);
      const hotelRef = {
        __typename: 'Hotel',
        id: booking.hotelId,
      };
      console.log(`[Bookings] Returning hotel reference:`, hotelRef);
      return hotelRef;
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
