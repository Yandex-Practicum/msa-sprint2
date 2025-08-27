import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import fetch from 'node-fetch';

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

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      console.log(`[Hotel] __resolveReference called for hotel id: ${id}`);
      const url = 'http://hotelio-monolith:8080';
      console.log(`[Hotel] Fetching hotel from ${url}/api/hotels/${id}`);

      const res = await fetch(`${url}/api/hotels/${id}`);
      if (!res.ok) {
        console.error(`[Hotel] Error fetching hotel: ${res.status} ${res.statusText}`);
        throw new Error(`Error while fetching hotel: ${res.status}`);
      }

      const hotel = await res.json();
      console.log(`[Hotel] Fetched hotel:`, hotel);
      return hotel;
    },
  },

  Query: {
    hotelsByIds: async (_, { ids }) => {
      console.log(`[Hotel] Query hotelsByIds called with ids:`, ids);
      const url = 'http://hotelio-monolith:8080';

      const hotels = await Promise.all(
        ids.map(async (id) => {
          console.log(`[Hotel] Fetching hotel id: ${id}`);
          const res = await fetch(`${url}/api/hotels/${id}`);
          if (!res.ok) {
            console.error(`[Hotel] Hotel service error for id ${id}: ${res.status} ${res.statusText}`);
            throw new Error(`Hotel service error: ${res.status}`);
          }
          const hotelData = await res.json();
          console.log(`[Hotel] Fetched hotel id ${id}:`, hotelData);
          return hotelData;
        })
      );

      console.log(`[Hotel] Returning ${hotels.length} hotels`);
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
