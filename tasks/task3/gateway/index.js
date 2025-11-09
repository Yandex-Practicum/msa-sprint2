// gateway/index.js
import { ApolloServer } from 'apollo-server';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'booking', url: 'http://booking-subgraph:4001' },
    { name: 'hotel',   url: 'http://hotel-subgraph:4002' },
  ],
  buildService: ({ url }) =>
    new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        if (context.userid) request.http.headers.set('userid', context.userid);
      },
    }),
});

const server = new ApolloServer({
  gateway,
  context: ({ req }) => ({
    userid: req.headers['userid'] || '',
  }),
  introspection: true,
  csrfPrevention: true,
  cache: 'bounded',
});

const PORT = process.env.PORT || 4000;
server
  .listen({ port: PORT })
  .then(({ url }) => console.log(`[gateway] up at ${url}`));
