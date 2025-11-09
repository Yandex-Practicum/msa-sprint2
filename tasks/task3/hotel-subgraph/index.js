// hotel-subgraph/index.js
import { ApolloServer, gql } from 'apollo-server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import DataLoader from 'dataloader';
import { request } from 'undici';

const HOTEL_API_BASE =
  process.env.HOTEL_API_BASE || 'http://monolith:8080';

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

// One batched REST call per request scope
async function fetchHotelsByIds(ids, signal) {
  const url = `${HOTEL_API_BASE.replace(/\/$/, '')}/api/hotels?ids=${ids
    .map(String)
    .join(',')}`;
  const { body } = await request(url, { method: 'GET', bodyTimeout: 3000, headersTimeout: 3000, signal });
  const arr = await body.json(); // expected: [{id,name,city,stars}, ...]
  const map = new Map((Array.isArray(arr) ? arr : []).map(h => [String(h.id), shape(h)]));
  return ids.map(id => map.get(String(id)) ?? null);
}

function shape(h) {
  return {
    id: String(h.id),
    name: h.name ?? null,
    city: h.city ?? null,
    stars: typeof h.stars === 'number' ? h.stars : null,
  };
}

function createLoaders() {
  return {
    hotels: new DataLoader(async ids => {
      const started = Date.now();
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 3000);
        try {
          const res = await fetchHotelsByIds(ids, ac.signal);
          console.info(
            `[hotel-subgraph] batch hotels size=${ids.length} durMs=${Date.now() - started}`
          );
          return res;
        } finally {
          clearTimeout(timer);
        }
      } catch (e) {
        console.error(
          `[hotel-subgraph] fetch error size=${ids.length} msg=${e?.message}`
        );
        return ids.map(() => null);
      }
    }, { cache: true })
  };
}

const resolvers = {
  Hotel: {
    __resolveReference: (ref, { loaders }) => loaders.hotels.load(ref.id),
  },
  Query: {
    hotelsByIds: (_, { ids }, { loaders }) => loaders.hotels.loadMany(ids),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  context: () => ({ loaders: createLoaders() }),
  introspection: true,
  cache: 'bounded',
});

const PORT = process.env.PORT || 4002;
server.listen({ port: PORT }).then(({ url }) => {
  console.log(`[hotel-subgraph] up at ${url}`);
});
