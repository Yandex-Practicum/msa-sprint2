import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

// Заголовки клиента (например, userid для ACL) не пробрасываются в подграфы
// сами по себе — пересылаем их явно через RemoteGraphQLDataSource.
class HeadersDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    if (context?.req?.headers) {
      const headers = context.req.headers;
      // Копируем userid (и любые другие нужные заголовки)
      if (headers.userid) {
        request.http.headers.set('userid', headers.userid);
      }
    }
  }
}

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'booking', url: 'http://booking-subgraph:4001' },
    { name: 'hotel', url: 'http://hotel-subgraph:4002' },
    { name: 'promocode', url: 'http://promocode-subgraph:4003' }
  ],
  buildService({ name, url }) {
    return new HeadersDataSource({ url });
  }
});

const server = new ApolloServer({
  gateway,
  subscriptions: false,
  // Apollo Sandbox (UI на http://localhost:4000) — для проверки запросов
  plugins: [ApolloServerPluginLandingPageLocalDefault()],
});

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ req }), // headers пробрасываются
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});
