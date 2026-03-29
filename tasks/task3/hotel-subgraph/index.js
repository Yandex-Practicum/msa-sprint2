import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import DataLoader from 'dataloader';

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

const MONOLITH_BASE_URL = process.env.MONOLITH_BASE_URL || '';

const mockHotels = {
  h1: { id: 'h1', name: 'Mock Hotel', city: 'Moscow', stars: 4 },
};

async function fetchHotelFromMonolith(id) {
  if (!MONOLITH_BASE_URL) {
    return mockHotels[id] || { id, name: `Hotel ${id}`, city: 'Unknown', stars: 3 };
  }
  const url = `${MONOLITH_BASE_URL.replace(/\/$/, '')}/api/hotels/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = await res.json();
  const name =
    j.description && String(j.description).trim()
      ? String(j.description).slice(0, 80)
      : `Hotel ${j.id}`;
  return {
    id: j.id,
    name,
    city: j.city ?? null,
    stars: j.rating != null ? Math.min(5, Math.max(0, Math.round(Number(j.rating)))) : null,
  };
}

function createHotelBatchLoader() {
  return new DataLoader(async (ids) => {
    const unique = [...new Set(ids)];
    const rows = await Promise.all(unique.map((id) => fetchHotelFromMonolith(String(id))));
    const byId = new Map();
    unique.forEach((id, i) => {
      byId.set(String(id), rows[i]);
    });
    return ids.map((id) => byId.get(String(id)) ?? null);
  });
}

const resolvers = {
  Hotel: {
    __resolveReference: (ref, { hotelLoader }) => hotelLoader.load(String(ref.id)),
  },
  Query: {
    hotelsByIds: async (_, { ids }, { hotelLoader }) => {
      const batch = await hotelLoader.loadMany(ids.map(String));
      return batch.map((x) => (x instanceof Error ? null : x));
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
  context: async () => ({
    hotelLoader: createHotelBatchLoader(),
  }),
}).then(() => {
  console.log('✅ Hotel subgraph ready at http://localhost:4002/');
});
