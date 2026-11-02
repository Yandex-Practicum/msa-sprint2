import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
    willSendRequest({ request, context }) {
        if (context.req && context.req.headers) {
            if (context.req.headers['x-user-id']) {
                request.http.headers.set('x-user-id', context.req.headers['x-user-id']);
            }
            if (context.req.headers['authorization']) {
                request.http.headers.set('authorization', context.req.headers['authorization']);
            }
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

const server = new ApolloServer({ gateway, subscriptions: false });

startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => ({ req }),
}).then(({ url }) => {
    console.log(`🚀 Gateway ready at ${url}`);
});