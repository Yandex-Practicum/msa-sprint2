import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import DataLoader from 'dataloader';
import gql from 'graphql-tag';

const HOTEL_API_BASE = process.env.HOTEL_API_BASE || 'http://monolith:8080';

const typeDefs = gql`
  type Hotel @key(fields: "id") {
    id: ID!
    name: String!
    city: String!
    stars: Int!
    rating: Float!
    description: String
    operational: Boolean!
    address: String
  }

  extend type Booking @key(fields: "hotelId") {
    hotelId: ID! @external
    hotel: Hotel
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]!
  }
`;

async function fetchHotelsByIds(ids) {
  const url = `${HOTEL_API_BASE}/api/hotels/by-ids?ids=${encodeURIComponent(ids.join(','))}`;
  const started = Date.now();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`hotel API error: HTTP ${res.status}`);
  const hotels = await res.json();
  console.log(
    `[hotel-subgraph] batch REST /api/hotels/by-ids (${ids.length} id, 1 запрос) за ${Date.now() - started}ms`,
  );
  return hotels;
}

function createHotelLoader() {
  return new DataLoader(
    async (ids) => {
      const hotels = await fetchHotelsByIds(ids);
      const byId = new Map(hotels.map((h) => [String(h.id), h]));
      return ids.map((id) => byId.get(String(id)) || null);
    },
    { cache: true },
  );
}

const pretty = (id) =>
  String(id || '')
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');

const resolvers = {
  Hotel: {
    __resolveReference: async (ref, { loader }) => {
      const hotel = await loader.load(ref.id);
      if (!hotel) return null;
      return { ...hotel, __graphId: ref.id };
    },
    id: (hotel) => String(hotel.id || hotel.__graphId),
    name: (hotel) =>
      hotel.name || `${pretty(hotel.id || hotel.__graphId)} (${pretty(hotel.city)})`,
    stars: (hotel) => hotel.stars ?? Math.round(hotel.rating || 0),
    address: (hotel) => hotel.address || `${pretty(hotel.id || hotel.__graphId)} Ave, ${hotel.city}`,
  },
  Booking: {
    hotel: (booking, _args, { loader }) => loader.load(booking.hotelId),
  },
  Query: {
    hotelsByIds: async (_, { ids }, { loader }) => loader.loadMany(ids),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
  context: async ({ req }) => ({ req, loader: createHotelLoader() }),
}).then(({ url }) => {
  console.log(`[hotel-subgraph] ready at ${url}`);
});