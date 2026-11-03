import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';

// Сам Apollo Gateway не передаёт заголовки клиента в подграфы. Для ACL подграфу нужен userid,
// поэтому заголовок пробрасывается явно.
const FORWARDED_HEADERS = ['userid'];

class HeaderForwardingDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    if (!context.req) {
      return;
    }
    for (const header of FORWARDED_HEADERS) {
      const value = context.req.headers[header];
      if (value) {
        request.http.headers.set(header, value);
      }
    }
  }
}

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'booking', url: 'http://booking-subgraph:4001' },
      { name: 'hotel', url: 'http://hotel-subgraph:4002' },
    ],
  }),
  buildService: ({ url }) => new HeaderForwardingDataSource({ url }),
});

// Стек вызовов в ответе клиенту раскрывает внутреннее устройство сервисов
const server = new ApolloServer({ gateway, includeStacktraceInErrorResponses: false });

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ req }),
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});
