import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import DataLoader from 'dataloader';

const hotels = [
  {
    id: 'test-hotel-1',
    name: 'Test Hotel One',
    city: 'Seoul',
    stars: 5,
  },
  {
    id: 'h1',
    name: 'Hotel One',
    city: 'Berlin',
    stars: 5,
  },
  {
    id: 'h2',
    name: 'Hotel Two',
    city: 'Paris',
    stars: 4,
  },
];

async function batchHotels(ids) {
  console.log('Batch load hotels:', ids);
  return ids.map((id) => hotels.find((hotel) => hotel.id === id) || null);
}

const typeDefs = gql`
  type Hotel @key(fields: "id") {
    id: ID!
    name: String
    city: String
    stars: Int
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]
    hotelById(id: ID!): Hotel
  }
`;

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }, { hotelLoader }) => {
      return hotelLoader.load(id);
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }, { hotelLoader }) => {
      return Promise.all(ids.map((id) => hotelLoader.load(id)));
    },
    hotelById: async (_, { id }, { hotelLoader }) => {
      return hotelLoader.load(id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
  context: async () => ({
    hotelLoader: new DataLoader(batchHotels),
  }),
}).then(() => {
  console.log('✅ Hotel subgraph ready at http://localhost:4002/');
});