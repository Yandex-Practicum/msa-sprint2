import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { RestClient } from './rest-client.js';
import { GraphQLError } from 'graphql';
import gql from 'graphql-tag';

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Float
    hotel: Hotel
  }

  extend type Hotel @key(fields: "id") {
    id: ID! @external
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }

`;

var bookingService = new RestClient('http://booking-service:8080/api');

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      console.log('bookingsByUser');

      const userIdFromHeader = req.headers.userid;
      if (!userIdFromHeader) {
        throw new GraphQLError('No user info in the Header.');
      }
      if (userId !== userIdFromHeader) {
        throw new GraphQLError('Wrong user info.');
      }

      if (!userId) return []; 

      var bookingsJson = await bookingService.fetch('/bookings?userId=' + userId);
      console.log('Got bookings: ' + JSON.stringify(bookingsJson));
      return bookingsJson;
    },
  },
  Booking: {
    __resolveReference: async ({ id }) => {
      console.log('Resolve booking ' + id);
      var bookingJson = await bookingService.fetch('/bookings/' + id);
      console.log('Got a booking: ' + JSON.stringify(bookingJson));
      return bookingJson || null;    
    },
    hotel: (booking) => {
      // Return a reference for the gateway to resolve via the Hotel subgraph
      return { id: booking.hotelId };
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
