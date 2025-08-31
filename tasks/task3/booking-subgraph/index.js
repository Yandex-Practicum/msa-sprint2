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

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      console.log('bookingsByUser called with userId: ', userId);
      const authorizedUserId = 'user1';
      if (!authorizedUserId || authorizedUserId !== userId) {
        console.log('bookingsByUser, User is unauthorized: ', userId);
        return []; // Не возвращаем данные, если пользователь не авторизован
      }

      return [
        {
          id: 'b1',
          userId,
          hotelId: 'h1',
          discountPercent: 20,
          promoCode: 'SUMMER',
        },
      ];
    },
  },
  Booking: {
    __resolveReference: async ({ id }) => {
      console.log('__resolveReference called with id: ', id, '');
      return {
        id,
        userId: 'u1',
        hotelId: 'h1',
        discountPercent: 20,
        promoCode: 'SUMMER',
      };
    },
  },
  hotel: async (booking) => {
    return { __typename: 'Hotel', id: booking.hotelId };
  }

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
