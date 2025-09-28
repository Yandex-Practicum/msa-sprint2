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


const url = 'http://host.docker.internal:8084';

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      const res = await fetch(`${url}/api/hotels/${id}`);
      if (!res.ok) {
        throw new Error(`Error while fetching hotel: ${res.status}`);
      }
      const hotel = await res.json();
      return hotel;
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }) => {
      const hotels = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`${url}/api/hotels/${id}`);
          if (!res.ok) {
            throw new Error(`Hotel service error: ${res.status}`);
          }
          const hotelData = await res.json();
          return hotelData;
        })
      );
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
