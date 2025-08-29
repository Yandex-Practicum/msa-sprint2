const { ApolloServer } = require('@apollo/server');
const { ApolloGateway } = require('@apollo/gateway');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { RemoteGraphQLDataSource } = require('@apollo/gateway');

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'booking', url: 'http://hotelio-booking-subgraph:4001' },
    { name: 'hotel', url: 'http://hotelio-hotel-subgraph:4002' },
  ],
  experimental_pollIntervalMs: 10000,
  buildService: ({ url }) => {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        console.log('Gateway willSendRequest called');
        console.log('Context:', JSON.stringify(context, null, 2));
        console.log('Request headers:', request.http.headers);
        
        if (context && context.req && context.req.headers) {
          console.log('Setting headers from context:', context.req.headers);
          Object.keys(context.req.headers).forEach(key => {
            request.http.setHeader(key, context.req.headers[key]);
            console.log(`Set header ${key}: ${context.req.headers[key]}`);
          });
        }
      },
    });
  },
});

const server = new ApolloServer({
  gateway,
  introspection: true,
});

const port = process.env.PORT || 4000;

startStandaloneServer(server, {
  listen: { port },
  context: async ({ req }) => {
    return { req };
  },
}).then(({ url }) => {
  console.log(`Apollo Gateway ready at ${url}`);
  console.log(`GraphQL Playground available at ${url}`);
});
