import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import DataLoader from 'dataloader';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://localhost:8080';

const typeDefs = gql`
  type Hotel @key(fields: "id") {
    id: ID!
    city: String
    rating: Float
    description: String
    operational: Boolean
    fullyBooked: Boolean
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]
    hotel(id: ID!): Hotel
  }
`;

function createHotelLoader() {
  return new DataLoader(
    async (ids) => {
      console.log(`[DataLoader] Batching ${ids.length} hotel(s): ${ids.join(', ')}`);
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`${MONOLITH_URL}/api/hotels/${id}`)
            .then((r) => {
              if (!r.ok) {
                console.warn(`[REST] GET /api/hotels/${id} → ${r.status}`);
                return null;
              }
              return r.json();
            })
            .catch((err) => {
              console.error(`[REST] Error fetching hotel ${id}:`, err.message);
              return null;
            })
        )
      );
      return results;
    },
    { cache: true }
  );
}

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }, { hotelLoader }) => {
      return hotelLoader.load(id);
    },
  },

  Query: {
    hotelsByIds: async (_, { ids }, { hotelLoader }) => {
      return hotelLoader.loadMany(ids);
    },
    hotel: async (_, { id }, { hotelLoader }) => {
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
    hotelLoader: createHotelLoader(),
  }),
}).then(() => {
  console.log('✅ Hotel subgraph ready at http://localhost:4002/');
  console.log(`   Monolith URL: ${MONOLITH_URL}`);
});
