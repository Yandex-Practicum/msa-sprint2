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
          // // ACL: Проверка header userid
          const userid = req.headers['userid'];
          if (!userid) throw new Error('Unauthorized: userid header required');
		      return [
                {
                  id: 'booking-1',
                  userId: 'user-123',
                  hotelId: 'hotel-456',
                  promoCode: 'SUMMER20',
                  discountPercent: 15,
                },
                {
                  id: 'booking-2',
                  userId: 'user-123',
                  hotelId: 'hotel-789',
                  promoCode: null,
                  discountPercent: null,
                },
              ];
    },
  },
  Booking: {
	      __resolveReference: async ({ id }) => {
            return {
              id: id,
              userId: 'user-123',
              hotelId: 'hotel-456',
              promoCode: 'STATIC-PROMO',
              discountPercent: 10,
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
