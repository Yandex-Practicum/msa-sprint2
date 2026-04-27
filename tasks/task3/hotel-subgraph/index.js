import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import DataLoader from 'dataloader';
import gql from 'graphql-tag';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';

const fallbackHotels = new Map([
  [
    'test-hotel-1',
    {
      id: 'test-hotel-1',
      name: 'Seoul Downtown Hotel',
      city: 'Seoul',
      stars: 5,
      rating: 4.7,
      description: 'Modern hotel in Seoul downtown with spa and skybar.',
    },
  ],
  [
    'test-hotel-2',
    {
      id: 'test-hotel-2',
      name: 'Busan Ocean Resort',
      city: 'Busan',
      stars: 5,
      rating: 4.5,
      description: 'Luxury beach resort in Busan with ocean view.',
    },
  ],
  [
    'test-hotel-3',
    {
      id: 'test-hotel-3',
      name: 'Daegu Business Hotel',
      city: 'Daegu',
      stars: 4,
      rating: 3.8,
      description: 'Affordable business hotel in Daegu center.',
    },
  ],
]);

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.3"
      import: ["@key"]
    )

  type Hotel @key(fields: "id") {
    id: ID!
    name: String
    city: String
    stars: Int
    rating: Float
    description: String
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]!
  }
`;

function normalizeHotel(raw, id) {
  const rating = Number(raw.rating ?? 0);
  return {
    id: String(raw.id ?? id),
    name: raw.name ?? raw.description ?? `Hotel ${raw.id ?? id}`,
    city: raw.city ?? null,
    stars: Number(raw.stars ?? Math.max(1, Math.min(5, Math.round(rating)))),
    rating,
    description: raw.description ?? null,
  };
}

async function fetchHotel(id) {
  try {
    const response = await fetch(`${MONOLITH_URL}/api/hotels/${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new Error(`Hotel REST API returned ${response.status}`);
    }
    return normalizeHotel(await response.json(), id);
  } catch (error) {
    console.log(`Hotel REST API is unavailable for ${id}, using demo hotel: ${error.message}`);
    return fallbackHotels.get(id) || null;
  }
}

async function batchHotels(ids) {
  const uniqueIds = [...new Set(ids)];
  console.log(`Batch loading hotels: ${uniqueIds.join(', ')}`);
  const loaded = await Promise.all(uniqueIds.map(fetchHotel));
  const byId = new Map();
  loaded.forEach((hotel) => {
    if (hotel) {
      byId.set(hotel.id, hotel);
    }
  });

  return ids.map((id) => byId.get(id) || null);
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
