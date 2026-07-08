import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'booking', url: 'http://booking-subgraph:4001' },
    { name: 'hotel', url: 'http://hotel-subgraph:4002' },
    { name: 'promo', url: 'http://promo-subgraph:4003' }
  ],
  buildService({ url }) {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        if (context?.userid) {
          request.http.headers.set('userid', context.userid);
        }
        if (context?.authorization) {
          request.http.headers.set('authorization', context.authorization);
        }
      },
    });
  },
});

const server = new ApolloServer({ gateway, subscriptions: false });

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({
    userid: req.headers.userid,
    authorization: req.headers.authorization,
    req,
  }),
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});
