import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';


const gateway = new ApolloGateway({
  serviceList: [
    { name: 'booking', url: process.env.BOOKING_SUBGRAPH ?? 'http://localhost:4001' },
    { name: 'hotel', url: process.env.HOTEL_SUBGRAPH ?? 'http://localhost:4002' }
  ],
  buildService({ url }) {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        if (context.req?.headers) {
          for (let header in context.req.headers) {
            request.http.headers.set(h, context.req.headers[header]);
          }
        }
      }
    });
  },
});

const server = new ApolloServer({ gateway, subscriptions: false });

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ req }), // headers пробрасываются
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});