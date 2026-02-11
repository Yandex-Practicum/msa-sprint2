import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';

class ForwardHeadersDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    if (context?.req?.headers) {
      for (const [key, value] of Object.entries(context.req.headers)) {
        if (typeof value === 'string') {
          request.http.headers.set(key, value);
        }
      }
    }
  }
}

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'booking',    url: 'http://booking-subgraph:4001' },
      { name: 'hotel',      url: 'http://hotel-subgraph:4002' },
      { name: 'promocode',  url: 'http://promocode-subgraph:4003' },
    ],
  }),
  buildService({ url }) {
    return new ForwardHeadersDataSource({ url });
  },
});

const server = new ApolloServer({ gateway });

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ req }),
});

console.log(`🚀 Gateway ready at ${url}`);
