import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLError } from 'graphql';
import gql from 'graphql-tag';

const typeDefs = gql`
  extend schema
    @link(url: "https://apollo.dev", import: ["@key"])

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

async function fetchHotelFromMonolith(id) {
  try {
    const response = await fetch(`http://monolith:8080/api/hotels/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Status ${response.status}`);
    
    const rawHotel = await response.json();
    
    return {
      id: rawHotel.id,
      name: `Hotel ${rawHotel.id}`,
      city: rawHotel.city,
      stars: rawHotel.rating ? Math.round(rawHotel.rating) : 0
    };
  } catch (error) {
    console.error(`Error resolving hotel details for ID ${id}:`, error);
    return null;
  }
}

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      return await fetchHotelFromMonolith(id);
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }) => {
      const fetchPromises = ids.map(id => fetchHotelFromMonolith(id));
      const results = await Promise.all(fetchPromises);
      return results.filter(hotel => hotel !== null);
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
