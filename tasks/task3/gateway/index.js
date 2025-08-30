import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const gateway = new ApolloGateway({
	serviceList: [
		{ name: 'booking', url: process.env.BOOKING_SUBGRAPH_URL },
		{ name: 'hotel', url: process.env.HOTEL_SUBGRAPH_URL },
	],
	buildService({ name, url }) {
		return new RemoteGraphQLDataSource({
			url,
			willSendRequest({ request, context }) {
				if (context.req?.headers) {
					for (const [key, value] of Object.entries(context.req.headers)) {
						if (value) {
							request.http?.headers.set(key, value);
						}
					}
				}
			},
		});
	},
});

const server = new ApolloServer({ gateway, subscriptions: false });

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ req }), // headers пробрасываются
}).then(({ url }) => {
	console.log(`🚀 Gateway ready at ${url}`);
});
