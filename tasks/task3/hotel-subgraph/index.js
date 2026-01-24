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

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      console.log(`Hotel subgraph. __resolveReference called for hotel id: ${id}`);

      const hotel = await getHotelById(id);
      console.log('Hotel subgraph. Fetched hotel:', hotel);
      return hotel;
    },
  },

  Query: {
    hotelsByIds: async (_, { ids }, { req }) => {
      console.log('Hotel subgraph. Query hotelsByIds called with ids:', ids);

      const hotels = await Promise.all(ids.map(id => getHotelById(id)));

      console.log('Hotel subgraph. Got hotels:', hotels);
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

async function getHotelById(id) {
  const url = process.env.MONOLITH_URL ?? 'http://localhost:8084';
  console.log(`Hotel subgraph. Fetching hotel from ${url}/api/hotels/${id}`);

  try {
    const response = await fetch(`${url}/api/hotels/${id}`);
    if (response.ok) {
      return await response.json();
    } else {
      console.error(`Error fetching hotel: ${response.status} ${response.statusText}`);
    }
  } catch (e) {
    console.error(`Hotel subgraph. Error fetching hotel: ${e.message}`);
    throw new Error(`Error while fetching hotel: ${e.message}`);
  }
}