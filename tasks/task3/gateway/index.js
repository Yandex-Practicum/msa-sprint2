import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    // Передаем все заголовки от клиента к subgraphs
    if (context.req && context.req.headers) {
      Object.keys(context.req.headers).forEach(key => {
        if (key !== 'host' && key !== 'connection') {
          request.http.headers.set(key, context.req.headers[key]);
        }
      });
    }
  }
}

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'booking', url: 'http://booking-subgraph:4001' },
    { name: 'hotel', url: 'http://hotel-subgraph:4002' }
  ],
  buildService({ url }) {
    return new AuthenticatedDataSource({ url });
  }
});

const server = new ApolloServer({ 
  gateway, 
  subscriptions: false,
  // Включаем CORS для тестирования
  cors: {
    origin: true,
    credentials: true
  }
});

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ req }), // Передаем req в контекст
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
  console.log('📡 Передача заголовков к subgraphs включена');
});
