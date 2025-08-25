import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import { MonolithClient } from './monolith-client.js';

const typeDefs = gql`
    type Hotel @key(fields: "id") {
        id: ID!
        name: String
        city: String
        stars: Int
    }

    type Query {
        hotelsByIds(ids: [ID!]!): [Hotel]
    }
`;

const monolithClient = new MonolithClient();

const resolvers = {
	Hotel: {
		__resolveReference: async ({ id }) => {
			console.log(`Getting hotel by id = ${id} through REST...`)
			return monolithClient.getHotelById(id);
		},
	},
	Query: {
		hotelsByIds: async (_, { ids }) => {
			return Promise.all(ids.map(id => {
				monolithClient.getHotelById(id);
			}).filter(hotel => hotel != null));
		},
	},
};

const server = new ApolloServer({
	schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
	listen: { port: 4002 },
}).then(() => {
	console.log('✅ Hotel subgraph ready at http://localhost:4002/');
});
