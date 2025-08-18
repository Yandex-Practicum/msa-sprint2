import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import { HotelClient } from './hotel_client.js';

// Инициализация REST клиента
const hotelClient = new HotelClient(process.env.HOTEL_SERVICE);

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
      console.log('Resolving hotel reference:', id);

      try {
        return await hotelClient.getHotelById(id);
      } catch (error) {
        console.error('Failed to resolve hotel reference:', error);
        throw new Error('Hotel not found');
      }
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }) => {
      console.log('Fetching hotels by ids:', ids);
      try {
        return await hotelClient.getHotelsByIds(ids);
      } catch (error) {
        console.error('Failed to fetch hotels:', error);
        throw new Error('Failed to fetch hotels');
      }
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