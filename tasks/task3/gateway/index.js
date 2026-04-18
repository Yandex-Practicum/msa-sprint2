import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    const userId = context.req?.headers?.userid;
    if (userId) {
      request.http.headers.set('userid', userId);
    }
  }
}

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'booking', url: 'http://booking-subgraph:4001' },
      { name: 'hotel', url: 'http://hotel-subgraph:4002' },
      { name: 'promocode', url: 'http://promocode-subgraph:4003' }
    ]
  }),
  buildService({ url }) {
    return new AuthenticatedDataSource({ url });
  }
});

const server = new ApolloServer({
  gateway
});

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ req }),
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});