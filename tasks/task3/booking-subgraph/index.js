import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { listBookings } from './grpc.js'
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

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      bookings = listBookings(userId)
      return bookings.map((i) => {
       return  ({
          id: i.Id,
          userId: i.user_id,
          hotelId: i.hotel_id,
          promoCode: i.promo_code,
          discountPercent: i.discount_percent,
        });
      });
    },
  },
  Booking: {
    // TODO: Реальный вызов к grpc booking-сервису или заглушка + ACL
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
