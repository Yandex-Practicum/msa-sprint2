import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://host.docker.internal:8084';

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
    hotel: Hotel
  }

  type Hotel @key(fields: "id") {
    id: ID!
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
    bookingById(id: ID!): Booking
  }
`;

async function fetchBookingsByUser(userId) {
  const response = await fetch(
    `${BOOKING_SERVICE_URL}/api/bookings?userId=${encodeURIComponent(userId)}`
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Booking service error: ${response.status} ${text}`);
  }

  return response.json();
}

async function fetchBookingById(id) {
  const response = await fetch(
    `${BOOKING_SERVICE_URL}/api/bookings/${encodeURIComponent(id)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Booking service error: ${response.status} ${text}`);
  }

  return response.json();
}

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      const requesterId = req.headers['userid'];

      if (!requesterId) {
        return [];
      }

      if (requesterId !== userId) {
        return [];
      }

      const bookings = await fetchBookingsByUser(userId);

      return bookings.map((booking) => ({
        id: booking.id,
        userId: booking.userId,
        hotelId: booking.hotelId,
        promoCode: booking.promoCode ?? null,
        discountPercent: booking.discountPercent ?? 0,
      }));
    },

    bookingById: async (_, { id }, { req }) => {
      const requesterId = req.headers['userid'];

      if (!requesterId) {
        return null;
      }

      const booking = await fetchBookingById(id);

      if (!booking) {
        return null;
      }

      if (booking.userId !== requesterId) {
        return null;
      }

      return {
        id: booking.id,
        userId: booking.userId,
        hotelId: booking.hotelId,
        promoCode: booking.promoCode ?? null,
        discountPercent: booking.discountPercent ?? 0,
      };
    },
  },

  Booking: {
    hotel: (booking) => ({
      __typename: 'Hotel',
      id: booking.hotelId,
    }),
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