import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'booking', url: 'http://booking-subgraph:4001' },
      { name: 'hotel',   url: 'http://hotel-subgraph:4002' }
    ],
  }),

  buildService: ({ url }) =>
    new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        const userId =
          context.userId ??
          context.req?.headers['userid'] ??
          context.req?.headers['user-id'];

        if (userId) {
          request.http?.headers.set('userid', String(userId));
        }
      },
    }),
});

const server = new ApolloServer({ gateway, includeStacktraceInErrorResponses: false });

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({
    req,
    userId: req.headers['userid'] ?? req.headers['user-id'],
  }),
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});
