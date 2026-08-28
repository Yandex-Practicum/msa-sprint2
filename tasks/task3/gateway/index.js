import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, RemoteGraphQLDataSource, IntrospectAndCompose } from '@apollo/gateway';

// Кастомный data source, который пробрасывает заголовки
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    // Пробрасываем заголовок userid из контекста в запрос к субграфу
    if (context.userid) {
      request.http.headers.set('userid', context.userid);
    }
  }
}

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'booking', url: 'http://booking-subgraph:4001' },
      { name: 'hotel', url: 'http://hotel-subgraph:4002' },
      { name: 'promocode', url: 'http://promocode-subgraph:4003' }
    ],
  }),
  buildService({ url }) {
    return new AuthenticatedDataSource({ url });
  },
});

const server = new ApolloServer({ gateway });

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    // Читаем заголовок userid из входящего запроса
    const userid = req.headers.get?.('userid') || req.headers?.userid;
    return { userid };
  },
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});