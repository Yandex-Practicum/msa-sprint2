import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';


const gateway = new ApolloGateway({
  serviceList: [
    { name: 'booking-subgraph', url: 'http://booking-subgraph:4001' },
    { name: 'hotel-subgraph', url: 'http://hotel-subgraph:4002' },
    { name: 'promocode-subgraph', url: 'http://promocode-subgraph:4003' }
  ],
  buildService: ({ url }) =>
    new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        const headers = context?.req?.headers ?? {};
        if (headers['x-user-id']) request.http.headers.set('x-user-id', headers['x-user-id']);
        if (headers['x-role']) request.http.headers.set('x-role', headers['x-role']);
        if (headers.userid) request.http.headers.set('userid', headers.userid);
      },
    }),
});

const server = new ApolloServer({ gateway, subscriptions: false });

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ req }), // headers пробрасываются
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});
