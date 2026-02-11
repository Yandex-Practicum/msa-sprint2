import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import DataLoader from 'dataloader';
import gql from 'graphql-tag';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';

const typeDefs = gql`
  type Hotel @key(fields: "id") {
    id: ID!
    city: String
    rating: Float
    description: String
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]!
  }
`;

async function batchHotels(ids) {
  return Promise.all(
    ids.map(async (id) => {
      const res = await fetch(`${MONOLITH_URL}/api/hotels/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const h = await res.json();
      return {
        id: String(h.id),
        city: h.city ?? null,
        rating: h.rating ?? null,
        description: h.description ?? null,
      };
    })
  );
}

function createHotelLoader() {
  return new DataLoader(batchHotels, { cacheKeyFn: String });
}

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }, { hotelLoader }) => {
      return hotelLoader.load(String(id));
    },
  },

  Query: {
    hotelsByIds: async (_, { ids }, { hotelLoader }) => {
      return hotelLoader.loadMany(ids.map(String));
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4002 },
  context: async () => ({
    hotelLoader: createHotelLoader(),
  }),
});

console.log(`✅ Hotel subgraph ready at ${url}`);
