import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLError } from 'graphql';
import gql from 'graphql-tag';

const typeDefs = gql`
  extend schema
    @link(url: "https://apollo.dev", import: ["@key"])

  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
    hotel: Hotel
  }

  # 2. Tell this subgraph that Hotel exists externally
  type Hotel @key(fields: "id") {
    id: ID!
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

const resolvers = {
  Booking: {
    hotel(parent) {
      return { id: parent.hotelId };
    }
  },
  Query: {
    bookingsByUser: async (_, { userId }, { authUserId }) => {
      if (!authUserId) {
        throw new GraphQLError('Access Denied: Missing authentication token/header.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      if (authUserId !== userId) {
        throw new GraphQLError('Access Denied: You cannot view bookings for another user.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      try {
        const response = await fetch(`http://monolith:8080/api/bookings?userId=${userId}`);
        if (!response.ok) throw new Error(`Monolith status ${response.status}`);
        
        const data = await response.json();
        return data.map(b => ({
          id: String(b.id || (Math.random() * 1000).toFixed(0)),
          userId: b.userId,
          hotelId: b.hotelId,
          promoCode: b.promoCode || null,
          discountPercent: b.discountPercent ? Math.round(b.discountPercent) : 0
        }));
      } catch (error) {
        console.error("Failed fetching data from booking monolith:", error);
        throw new GraphQLError('Internal microservice communications error.');
      }
    },
  },
};

const loggingPlugin = {
  async requestDidStart(requestContext) {
    // Exclude basic schema discovery queries to avoid spamming your terminal
    if (requestContext.request.operationName === 'IntrospectionQuery') return;

    console.log(`[GraphQL Request] Operation: ${requestContext.request.operationName || 'Anonymous'}`);
    console.log(`[GraphQL Request] Query: ${requestContext.request.query.trim()}`);
    console.log(`[GraphQL Request] Headers: ${JSON.stringify(requestContext.contextValue?.req?.headers || {})}\n`);
    
    return {
      async didEncounterErrors(ctx) {
        console.error(`❌ [GraphQL Error] Messages: ${ctx.errors.map(e => e.message).join(', ')}`);
      }
    };
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  plugins: [loggingPlugin],
});


startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => {
    return { authUserId: req.headers['userid'] };
  },
}).then(() => {
  console.log('✅ Booking subgraph ready at http://localhost:4001/');
});
