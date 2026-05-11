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

  extend type Booking @key(fields: "id") {
    id: ID! @external
    hotel: Hotel
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]
  }
`;

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      const response = await fetch(`http://host.docker.internal:8084/api/hotels/${id}`);
      const data = await response.json();
      return {
        id: data.id,
        name: data.name,
        city: data.city,
        stars: data.rating,
      };
    },
  },
  Booking: {
    hotel: async (parent) => {
      const response = await fetch(`http://host.docker.internal:8084/api/hotels/${parent.hotelId}`);
      const data = await response.json();
      return {
        id: data.id,
        name: data.name,
        city: data.city,
        stars: data.rating,
      };
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }) => {
      const promises = ids.map(id => fetch(`http://host.docker.internal:8084/api/hotels/${id}`));
      const responses = await Promise.all(promises);
      const datas = await Promise.all(responses.map(r => r.json()));
      return datas.map(data => ({
        id: data.id,
        name: data.name,
        city: data.city,
        stars: data.rating,
      }));
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