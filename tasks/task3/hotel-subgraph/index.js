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

async function fetchHotelById(hotelId) {
    try {
        const reqUrl = `http://host.docker.internal:8084/api/hotels/${hotelId}`;
        const response = await fetch(reqUrl);
        const hotelDetails = await response.json();

        return {
            id: hotelDetails.id,
            name: null,
            city: hotelDetails.city,
            stars: Number.parseInt(hotelDetails.rating) || 0,
        };
    } catch (err) {
        console.error(`Failed to fetch a hotel ${hotelId}: `, err);

        return null;
    }
}

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
        return await fetchHotelById(id);
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }) => {
      return await Promise.all(ids.map(id => fetchHotelById(id)));
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
