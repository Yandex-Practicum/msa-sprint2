import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

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
  }

`;

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      const userHeader = req.headers['userid'];

      if (userHeader !== userId) {
        console.log('booking-subgraph. Access denied');
        throw new Error('Access denied');
      }

      const url = process.env.BOOKING_URL ?? 'http://localhost:8085';

      console.log(`Booking subgraph. Fetching bookings from ${url}/api/bookings?userId=${userId}...`);

      let response;
      try {
        response = await fetch(`${url}/api/bookings?userId=${userId}`);
      } catch (error) {
        console.error(`Booking subgraph. Error fetching bookings: ${error.message}`);
        throw new Error(`Error while fetching bookings: ${error.message}`);
      }

      const bookings = await response.json();

      console.log('Booking subgraph. Got bookings:', bookings);

      return bookings;
    },
  },

  Booking: {
    // Получение информации о гостинице по ID
    hotel: (booking) => {
      console.log(`Booking subgraph. Getting hotel for booking: ${booking.hotel_id}...`);

      // Возвращаем объект гостиницы
      return {
        __typename: 'Hotel',
        id: booking.hotel_id,
      };
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
