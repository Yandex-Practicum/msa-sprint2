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
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }

`;
import BookingService from './bookingService.js';
/**
   * 
   * @param {string} serviceUrl - URL к Hotel-сервису
   */

const serviceUrl = process.env.SERVICE_URL;
console.log('   Hotel service' + process.env.SERVICE_URL)
if (!serviceUrl) {
  throw new Error('serviceUrl is not defined in environment variables');
}
const bookingService = new BookingService(serviceUrl);

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      console.log(userId);
      var req = { user_id: userId };
      var r = await bookingService.listBookings(req); 
      return r
    }
  },
  Booking:{
    bookings: async (_, { bookingRequest}, { req }) => {
	  // TODO: Реальный вызов к grpc booking-сервису или заглушка + ACL
      console.log(bookingRequest);
      return await bookingService.createBooking(bookingRequest);
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
