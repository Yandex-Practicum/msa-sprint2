import {ApolloServer} from '@apollo/server';
import {startStandaloneServer} from '@apollo/server/standalone';
import {ApolloGateway, RemoteGraphQLDataSource} from '@apollo/gateway';

const gateway = new ApolloGateway({
    serviceList: [
        {name: 'booking', url: 'http://booking-subgraph:4001'},
        {name: 'hotel', url: 'http://hotel-subgraph:4002'}
    ],
    buildService: ({name, url}) => {
        return new RemoteGraphQLDataSource({
            url,
            willSendRequest({request, context}) {
                if (context?.req?.headers['userid']) {
                    request.http.headers.set('userid', context.req.headers['userid']);
                }
            }
        });
    }
});

const server = new ApolloServer({gateway, subscriptions: false,});

startStandaloneServer(server, {
    listen: {port: 4000},
    context: async ({req}) => ({req}), // headers пробрасываются
}).then(({url}) => {
    console.log(`🚀 Gateway ready at ${url}`);
});
