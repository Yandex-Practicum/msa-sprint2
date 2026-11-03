import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLError } from 'graphql';
import gql from 'graphql-tag';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://localhost:8084';
const REQUEST_TIMEOUT_MS = 2000;
const MAX_STARS = 5;

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Hotel @key(fields: "id") {
    id: ID!
    name: String
    city: String
    stars: Int
    rating: Float
    operational: Boolean
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]
  }
`;

async function fetchHotel(id) {
  const response = await fetch(`${MONOLITH_URL}/api/hotels/${encodeURIComponent(id)}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new GraphQLError(`Hotel service responded with ${response.status}`, {
      extensions: { code: 'SERVICE_UNAVAILABLE' },
    });
  }

  return toHotel(await response.json());
}

// У отеля в монолите нет названия и звёзд: название — его описание, звёзды — округлённый рейтинг.
function toHotel(hotel) {
  return {
    id: hotel.id,
    name: hotel.description,
    city: hotel.city,
    stars: Math.min(MAX_STARS, Math.round(hotel.rating)),
    rating: hotel.rating,
    operational: hotel.operational,
  };
}

// Шлюз присылает отели всех бронирований одним запросом _entities, и один отель повторяется много раз.
// Кэш живёт в контексте одного GraphQL-запроса: каждый отель запрашивается у монолита один раз.
function loadHotel(context, id) {
  if (!context.hotels.has(id)) {
    context.hotels.set(id, fetchHotel(id));
  }

  return context.hotels.get(id);
}

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }, context) => {
      console.log(`[Hotel.__resolveReference] id=${id}`);

      return loadHotel(context, id);
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }, context) => {
      console.log(`[hotelsByIds] ids=${ids.join(',')}`);
      const hotels = await Promise.all(ids.map((id) => loadHotel(context, id)));

      return hotels.filter(Boolean);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  includeStacktraceInErrorResponses: false,
});

startStandaloneServer(server, {
  listen: { port: 4002 },
  context: async () => ({ hotels: new Map() }),
}).then(() => {
  console.log(`✅ Hotel subgraph ready at http://localhost:4002/ (monolith: ${MONOLITH_URL})`);
});
