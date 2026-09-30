import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 5000);


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
    hotelsByIds(ids: [ID!]!): [Hotel]
  }
`;


async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHotelById(id) {
  const raw = await fetchJson(`${MONOLITH_URL}/api/hotels/${id}`);
  if (!raw) return null;

  return {
    id: String(raw.id ?? id),
    name: raw.name ?? null,
    city: raw.city ?? null,
    stars: raw.rating != null ? Math.round(raw.rating) : (raw.stars ?? null),
  };
}


const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      try {
        return await fetchHotelById(id);
      } catch (e) {
        console.error(`__resolveReference failed for hotel ${id}: ${e.message}`);
        return { id: String(id), name: null, city: null, stars: null };
      }
    },
  },

  Query: {
    hotelsByIds: async (_, { ids }) => {
      const results = await Promise.all(
        ids.map((id) =>
          fetchHotelById(id).catch((e) => {
            console.error(`Hotel ${id} fetch failed: ${e.message}`);
            return null;
          })
        )
      );
      return results.filter(Boolean);
    },
  },
};


const loggingPlugin = {
  async requestDidStart(requestContext) {
    if (requestContext.request.operationName === 'IntrospectionQuery') return;
    console.log(`[Hotel] op=${requestContext.request.operationName || 'anonymous'}`);
    return {
      async didEncounterErrors(ctx) {
        console.error(`[Hotel Error] ${ctx.errors.map((e) => e.message).join(', ')}`);
      },
    };
  },
};


const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  plugins: [loggingPlugin],
});

startStandaloneServer(server, {
  listen: { port: 4002, host: '0.0.0.0' },
}).then(({ url }) => {
  console.log(`✅ Hotel subgraph ready at ${url} (monolith → ${MONOLITH_URL})`);
});