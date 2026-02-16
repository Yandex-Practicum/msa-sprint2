import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import { createBooking, listBookings } from './grpc/booking_service.js';

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

  type Mutation {
    createBooking(
      userId: String!
      hotelId: String!
      promoCode: String
    ): Booking!
  }
`;

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      const headerUserId = req.headers['userid'];
      console.log('HEADERS:', req.headers);
      console.log('userid:', req.headers['userid']);

      if (!headerUserId || headerUserId !== userId) {
        throw new Error('Unauthorized');
      }
      
      try {
        const bookings = await listBookings(userId);

        return bookings.map(b => ({
          id: b.id,
          userId: b.user_id,
          hotelId: b.hotel_id,
          promoCode: b.promo_code || null,
          discountPercent: b.discount_percent,
        }));
      }
      catch (err) {
        console.error('listBookings error:', err)
        throw new Error('Failed to fetch bookings');
      }
    },
  },
  
  Mutation: {
    createBooking: async (_, { userId, hotelId, promoCode }, { req }) => {
      if (req.headers['userid'] !== userId) {
        throw new Error('Unauthorized');
      }

      try {
        const booking = await createBooking(
          userId,
          hotelId,
          promoCode
        );

        return {
          id: booking.id,
          userId: booking.user_id,
          hotelId: booking.hotel_id,
          promoCode: booking.promo_code || null,
          discountPercent: booking.discount_percent,
        };
      } catch (err) {
        console.error('createBooking error:', err);
        throw new Error('Failed to create booking');
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
