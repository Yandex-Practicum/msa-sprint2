import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import DataLoader from 'dataloader';

// ---------------------------------------------------------------------------
// Реальный источник отелей — монолит Hotelio (REST):
// GET {MONOLITH_URL}/api/hotels/{id} -> {id, city, rating, description, ...}
// Монолитная модель Hotel не содержит name/stars, поэтому для отображения
// формируем name = "Отель {id}", stars = 5 (пользовательское решение).
// ---------------------------------------------------------------------------
const MONOLITH_URL = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';

async function fetchHotel(id) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`${MONOLITH_URL}/api/hotels/${encodeURIComponent(id)}`, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// DataLoader решает проблему N+1: __resolveReference для многих бронирований
// в одном запросе группирует обращения по отелям в один батч и кеширует id.
function createHotelLoader() {
  return new DataLoader(async (ids) => {
    const wanted = Array.from(new Set(ids));
    console.log(`[hotel-subgraph] batch load hotels: ${JSON.stringify(wanted)}`);
    const results = await Promise.all(wanted.map(fetchHotel));
    const byId = new Map();
    wanted.forEach((id, i) => byId.set(id, results[i]));
    return ids.map((id) => byId.get(id) || null);
  });
}

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

const resolvers = {
  Hotel: {
    // Reference-резолвер: Apollo Federation вызывает его для каждого hotel { ... }
    // внутри бронирования. Сигнатура __resolveReference: (reference, context, info).
    __resolveReference: async (reference, context) => {
      const h = await context.loader.load(reference.id);
      if (!h) return null;
      return { id: h.id, name: `Отель ${h.id}`, city: h.city, stars: 5 };
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }, { loader }) => {
      const hotels = await loader.loadMany(ids);
      return hotels.map((h) => (h ? { id: h.id, name: `Отель ${h.id}`, city: h.city, stars: 5 } : null));
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
  context: async () => ({ loader: createHotelLoader() }),
}).then(() => {
  console.log('✅ Hotel subgraph ready at http://localhost:4002/');
});
