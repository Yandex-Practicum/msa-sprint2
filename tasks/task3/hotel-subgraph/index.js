import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import DataLoader from 'dataloader';
import gql from 'graphql-tag';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

  type Hotel @key(fields: "id") {
    id: ID!
    name: String
    city: String
    stars: Int
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]!
  }
`;

const hotels = {
  '1': { id: '1', name: 'Grand Hotel', city: 'Moscow', stars: 5 },
  '2': { id: '2', name: 'City Inn', city: 'Saint Petersburg', stars: 4 },
  '3': { id: '3', name: 'Budget Stay', city: 'Kazan', stars: 3 },
};

const batchHotelsById = async (ids) => ids.map((id) => hotels[id] ?? { id });

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }, { hotelByIdLoader }) => hotelByIdLoader.load(id),
  },
  Query: {
    hotelsByIds: async (_, { ids }, { hotelByIdLoader }) =>
      (await hotelByIdLoader.loadMany(ids)).map((item, index) =>
        item instanceof Error ? { id: ids[index] } : item,
      ),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
  context: async () => ({
    hotelByIdLoader: new DataLoader(batchHotelsById),
  }),
}).then(() => {
  console.log('Hotel subgraph ready at http://localhost:4002/');
});
