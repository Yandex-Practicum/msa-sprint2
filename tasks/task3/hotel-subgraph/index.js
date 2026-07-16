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

const MOCK_HOTELS = [
  { id: 'test-hotel-1', name: 'Grand Hotel', city: 'Berlin', stars: 5 },
  { id: 'test-hotel-2', name: 'Seaside Resort', city: 'Limassol', stars: 4 },
];

async function fetchHotelById(id) {
  return MOCK_HOTELS.find((h) => h.id === id) || null;
}

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
        return fetchHotelById(id);
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }) => {
      return Promise.all(ids.map((id) => fetchHotelById(id)));
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
