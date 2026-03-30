import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import axios from 'axios';
import DataLoader from 'dataloader';

const HOTEL_API_BASE = process.env.HOTEL_API_BASE || 'http://hotelio-monolith:8080';

const typeDefs = gql`
  type Hotel @key(fields: "id") {
    id: ID!
    name: String
    city: String
    stars: Int
  }

  extend type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]
  }
`;

async function fetchHotelById(id) {
  // tries a canonical endpoint; adjust if monolith differs
  const url = `${HOTEL_API_BASE}/api/hotels/${encodeURIComponent(id)}`;
  const res = await axios.get(url).catch(() => ({ data: null }));
  const h = res.data;
  if (!h) return null;
  return { id: String(h.id ?? id), name: h.name ?? null, city: h.city ?? null, stars: Number(h.stars ?? 0) };
}

async function fetchHotelsBatch(ids) {
  const promises = ids.map((id) => fetchHotelById(id));
  const arr = await Promise.all(promises);
  return arr;
}

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }, { loaders }) => loaders.hotelById.load(String(id)),
  },
  Query: {
    hotelsByIds: async (_, { ids }, { loaders }) => {
      const uniq = [...new Set(ids.map(String))];
      const loaded = await loaders.hotelById.loadMany(uniq);
      // Map back preserving original order (including duplicates)
      const map = new Map(uniq.map((k, i) => [k, loaded[i] || null]));
      return ids.map((id) => map.get(String(id)) || null);
    },
  },
};

function createLoaders() {
  return {
    hotelById: new DataLoader(async (keys) => {
      const list = await fetchHotelsBatch(keys);
      const byId = new Map(list.filter(Boolean).map((h) => [String(h.id), h]));
      return keys.map((k) => byId.get(String(k)) || null);
    }, { cache: true }),
  };
}

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
  context: async () => ({ loaders: createLoaders() }),
}).then(() => {
  console.log('✅ Hotel subgraph ready at http://localhost:4002/');
});
