import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';


const gateway = new ApolloGateway({
  serviceList: [
    { name: 'booking-subgraph', url: 'http://booking-subgraph:4001' },
    { name: 'hotel-subgraph', url: 'http://hotel-subgraph:4002' },
    { name: 'promocode-subgraph', url: 'http://promocode-subgraph:4003' }
  ],
  buildService({ url }) {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        if (context.userid) {
          request.http.headers.set('userid', context.userid);
        }
      },
    });
  },
});

const server = new ApolloServer({ gateway, subscriptions: false });

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ userid: req.headers.userid }),
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});
