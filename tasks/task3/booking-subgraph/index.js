import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLError } from 'graphql';
import gql from 'graphql-tag';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 5000);

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

  type Hotel @key(fields: "id") {
    id: ID!
  }

  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
    hotel: Hotel
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }

`;

const resolvers = {
  Booking: {
    hotel: (parent) => ({
      __typename: 'Hotel',
      id: parent.hotelId,
    }),
  },

  Query: {
    bookingsByUser: async (_, { userId }, { authUserId }) => {
      if (!authUserId) {
        throw new GraphQLError('Access Denied: Missing authentication header.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      if (authUserId !== userId) {
        throw new GraphQLError('Access Denied: You cannot view bookings for another user.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
      let data;
      try {
        const response = await fetch(
          `${MONOLITH_URL}/api/bookings?userId=${encodeURIComponent(userId)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`Monolith status ${response.status}`);
        data = await response.json();
      } catch (error) {
        console.error('Failed fetching bookings from monolith:', error.message);
        throw new GraphQLError('Internal microservice communications error.', {
          extensions: { code: 'UNAVAILABLE' },
        });
      } finally {
        clearTimeout(timer);
      }

      return data.map((b) => ({
        id: String(b.id),
        userId: b.userId,
        hotelId: b.hotelId,
        promoCode: b.promoCode || null,
        discountPercent: Math.round(Number(b.discountPercent) || 0),
      }));
    },
  },
};

const loggingPlugin = {
  async requestDidStart(requestContext) {
    if (requestContext.request.operationName === 'IntrospectionQuery') return;

    const user = requestContext.contextValue?.authUserId || 'anonymous';
    console.log(`[GraphQL] user=${user} op=${requestContext.request.operationName || 'anonymous'}`);

    return {
      async didEncounterErrors(ctx) {
        const user = ctx.contextValue?.authUserId || 'anonymous';
        console.error(
          `[GraphQL Error] user=${user} errors=${ctx.errors.map((e) => e.message).join(', ')}`
        );
      },
    };
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  plugins: [loggingPlugin],
});

startStandaloneServer(server, {
  listen: { port: 4001, host: '0.0.0.0' },
  context: async ({ req }) => ({ authUserId: req.headers['userid'] }),
}).then(() => {
  console.log(`✅ Booking subgraph ready at http://localhost:4001/ (monolith → ${MONOLITH_URL})`);
});