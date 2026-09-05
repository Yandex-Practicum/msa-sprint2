import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { RestClient } from './rest-client.js';
import NodeCache from 'node-cache';
import gql from 'graphql-tag';

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

var monolithClient = new RestClient('http://monolith:8080/api');

// In-memory cache for Hotel objects, keyed by Hotel.id.
// stdTTL: 300s (5 min) expiration, checkperiod: 60s cleanup interval.
const hotelCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

async function getHotelById(id) {
  const cached = hotelCache.get(id);
  if (cached) {
    console.log('Cache hit for hotel ' + id);
    return cached;
  }

  const hotelJson = await monolithClient.fetch('/hotels/' + id);
  console.log('Got hotel: ' + JSON.stringify(hotelJson));

  const hotel = {
    id: hotelJson.id,
    name: hotelJson.name || hotelJson.description || 'No name',
    city: hotelJson.city,
    stars: Math.round(hotelJson.rating),
    description: hotelJson.description || ""
  };

  hotelCache.set(id, hotel);
  console.log('Cached hotel ' + id);
  return hotel;
}

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      console.log('Resolve hotel ' + id);

      if (!id) return null;

      return await getHotelById(id);
    },
  },

  Query: {
    hotelsByIds: async (_, { ids }) => {
      console.log("hotelsByIds");

      if (!ids) return [];

      var hotels = Array();
      for (const id of ids) {
        var hotel = await getHotelById(id);
        hotels.push(hotel);
      };

      console.log('Got hotels: ' + JSON.stringify(hotels));
      return hotels;
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
}).then(() => {
  console.log('✅ Hotel subgraph ready at http://localhost:4002/');
});