import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import { GraphQLError } from 'graphql';

const loggingPlugin = {
  async requestDidStart({ request, contextValue }) {
    const uid = contextValue?.req?.headers?.['userid'];
    console.log(
      '➡️  request',
      JSON.stringify({
        userid: uid || null,
        opName: request.operationName || null,
        vars: request.variables || {},
      })
    );

    return {
      willSendResponse({ errors, response }) {
        if (errors?.length) {
          console.error('❌ errors:', errors.map(e => e.message));
        } else {
          console.log('✅ ok');
        }
      },
    };
  },
};

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
    hotel: Hotel
  }

  extend type Hotel @key(fields: "id") {
    id: ID! @external
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

const stubBookings = [
  { id: 'b1', userId: 'user-001', hotelId: 'hotel-777', promoCode: null, discountPercent: 0 },
  { id: 'b2', userId: 'user-001', hotelId: 'hotel-777', promoCode: 'SUMMER', discountPercent: 20 },
  { id: 'b3', userId: 'user-005', hotelId: 'hotel-888', promoCode: null, discountPercent: 0 },
];

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      const authUser = req.headers['userid'];

      if (!authUser) {
        console.warn(`🛑 deny: no userid header`);
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
      }

      if (authUser !== userId) {
        console.warn(`🛑 deny: header(${authUser}) != arg(${userId})`);
        return [];
      }

      // решил использовать заглушку, т.к. время поджимало
      const result = stubBookings.filter(b => b.userId === userId);
      console.log(`✅ allow: ${result.length} bookings for ${userId}`);
      return result;
    },
  },

  Booking: {
    hotel: (booking) => ({ __typename: 'Hotel', id: booking.hotelId }),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  plugins: [loggingPlugin],
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => ({ req }),
}).then(() => {
  console.log('✅ Booking subgraph ready at http://localhost:4001/');
});
