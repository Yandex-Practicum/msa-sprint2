import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  async willSendRequest({ request, context }) {
    // Получаем заголовки из контекста
    const headers = context.req?.headers || {};

    // Пробрасываем все нужные заголовки в подграфы
    if (headers['user-id']) {
      request.http.headers.set('user-id', headers['user-id']);
    }


    // Для отладки
    console.log('Forwarding headers to subgraph:', {
      'user-id': headers['user-id']
    });
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
  subscriptions: false
});

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    // Логируем входящие заголовки
    console.log('Incoming request headers:', {
      'user-id': req.headers['user-id']
    });

    return {
      req,
      userId: req.headers['user-id'] // Дополнительно выносим userId в контекст
    };
  },
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});