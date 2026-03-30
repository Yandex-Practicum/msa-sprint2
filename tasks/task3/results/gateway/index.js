import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'booking-subgraph', url: 'http://booking-subgraph:4001' },
    { name: 'hotel-subgraph', url: 'http://hotel-subgraph:4002' },
    { name: 'promocode-subgraph', url: 'http://promocode-subgraph:4003' }
  ],
  buildService: ({ url, name }) =>
    new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        const headers = context?.headers || {};
        for (const [k, v] of Object.entries(headers)) {
          if (typeof v === 'string') request.http.headers.set(k, v);
        }
      },
    }),
});

const server = new ApolloServer({ gateway });

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ headers: req.headers || {} }),
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});
