import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';

// Класс для передачи заголовков авторизации в субграфы
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    // Передаём userId из контекста в заголовок запроса к субграфу
    if (context.userId) {
      request.http.headers.set('x-user-id', context.userId);
      console.log(`🔑 Gateway: Sending x-user-id=${context.userId} to ${request.http.url}`);
    }
    if (context.authToken) {
      request.http.headers.set('authorization', context.authToken);
    }
  }
}

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'booking', url: process.env.BOOKING_SUBGRAPH_URL || 'http://localhost:4001/graphql' },
      { name: 'hotel', url: process.env.HOTEL_SUBGRAPH_URL || 'http://localhost:4002/graphql' },
      { name: 'promocode', url: process.env.PROMOCODE_SUBGRAPH_URL || 'http://localhost:4003/graphql' }
    ]
  }),
  buildService({ name, url }) {
    return new AuthenticatedDataSource({ url });
  }
});

const server = new ApolloServer({
  gateway,
  subscriptions: false,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    const userId = req.headers['x-user-id'];
    console.log(`🌉 Gateway received request: x-user-id=${userId}`);

    return {
      userId: userId,
      authToken: req.headers.authorization
    };
  },
});

console.log(`✅ Apollo Gateway ready at ${url}`);
console.log(`   Booking subgraph: ${process.env.BOOKING_SUBGRAPH_URL || 'http://localhost:4001/graphql'}`);
console.log(`   Hotel subgraph: ${process.env.HOTEL_SUBGRAPH_URL || 'http://localhost:4002/graphql'}`);
console.log(`   Promocode subgraph: ${process.env.PROMOCODE_SUBGRAPH_URL || 'http://localhost:4003/graphql'}`);