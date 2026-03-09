import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

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

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
            return {
              id: id, // keep the requested id for correctness
              name: 'Mock Hotel Name',
              city: 'Mock City',
              stars: 4,
            };
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }) => {
            return [
              { id: '1', name: 'Static Hotel One', city: 'Paris', stars: 5 },
              { id: '2', name: 'Static Hotel Two', city: 'London', stars: 4 },
            ];
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
