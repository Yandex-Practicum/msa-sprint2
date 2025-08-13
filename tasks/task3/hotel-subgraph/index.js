import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
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

import HotelClient from './hotelService.js';
/**
   * 
   * @param {string} serviceUrl - URL к Hotel-сервису
   */

const serviceUrl = process.env.SERVICE_URL;
console.log('Graph service' + process.env.SERVICE_URL)
if (!serviceUrl) {
  throw new Error('serviceUrl is not defined in environment variables');
}
const client = new HotelClient(serviceUrl);



const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      // TODO: Реальный вызов к hotel-сервису или заглушка
      return await client.getHotelById(id)
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }) => {
      // TODO: Заглушка или REST-запрос
      return await client.getHotelsByIds(ids)
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
