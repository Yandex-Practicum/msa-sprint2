import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import { BookingClient } from './client.js';

// Инициализация gRPC клиента
const bookingClient = new BookingClient(process.env.BOOKING_SERVICE);

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      // Проверка ACL
      if (!req.headers['user-id'] || req.headers['user-id'] !== userId) {
        throw new Error('Unauthorized: You can only request your own bookings');
      }

      try {
        return await bookingClient.listBookings(userId);
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
        throw new Error('Failed to fetch bookings');
      }
    },
  },
  Booking: {
    __resolveReference: async (booking, { req }) => {
      // Проверка ACL
      if (!req.headers['user-id'] || req.headers['user-id'] !== booking.userId) {
        throw new Error('Unauthorized: You can only access your own bookings');
      }

      try {
        return await bookingClient.getBookingById(booking.userId, booking.id);
      } catch (error) {
        console.error('Failed to fetch booking:', error);
        throw new Error('Booking not found');
      }
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