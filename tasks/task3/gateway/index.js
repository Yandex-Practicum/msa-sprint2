import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'booking', url: 'http://booking-subgraph:4001' },
    { name: 'hotel', url: 'http://hotel-subgraph:4002' },
    { name: 'promocode', url: 'http://promocode-subgraph:4003' },
  ],
  buildService({ name, url }) {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        // Пробрасываем заголовки из контекста Gateway в субграфы
        if (context.req?.headers) {
           Object.entries(context.req.headers).forEach(([key, value]) => {
             if (typeof value === 'string') {
               request.http.headers.set(key, value);
             }
           });
        }
      },
    });
  },
});

const server = new ApolloServer({ 
  gateway, 
  subscriptions: false 
});

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    console.log('🚪 Gateway received headers:', req.headers);
    console.log('🔑 userid header:', req.headers.userid);
    return { req };
  },
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});