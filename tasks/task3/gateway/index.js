import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  // прокидываем заголовки из исходного запроса
  willSendRequest({ request, context }) {
    if (context.req?.headers) {
      const auth = context.req.headers['authorization'];
      if (auth) {
        request.http.headers.set('authorization', auth);
      }
    }
  }
}

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'booking', url: 'http://booking-subgraph:4001' },
      { name: 'hotel', url: 'http://hotel-subgraph:4002' },
    ],
  }),
  buildService: ({ url }) => new AuthenticatedDataSource({ url }),
});

const server = new ApolloServer({
  gateway,
  subscriptions: false,
});

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ req }),
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});
