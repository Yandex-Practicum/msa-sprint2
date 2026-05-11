import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    if (context.headers) {
      Object.entries(context.headers).forEach(([key, value]) => {
        request.http.headers.set(key, value);
      });
    }
  }
}

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'booking', url: 'http://booking-subgraph:4001' },
    { name: 'hotel', url: 'http://hotel-subgraph:4002' }
  ],
  buildService({ name, url }) {
    return new AuthenticatedDataSource({ url });
  }
});

const server = new ApolloServer({ gateway });

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ headers: req.headers })
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});