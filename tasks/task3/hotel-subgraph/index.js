const { ApolloServer } = require('@apollo/server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { gql } = require('graphql-tag');
const axios = require('axios');

const typeDefs = gql`
  type Hotel @key(fields: "id") {
    id: ID!
    name: String!
    city: String!
    description: String
    rating: Float
    amenities: [String!]
  }

  type Query {
    hotels: [Hotel!]!
    hotel(id: ID!): Hotel
  }
`;

const resolvers = {
  Query: {
    hotels: async () => {
      try {
        const response = await axios.get('http://hotelio-monolith-task3:8080/api/hotels');
        return response.data.map(hotel => ({
          id: hotel.id,
          name: hotel.name,
          city: hotel.city,
          description: hotel.description,
          rating: hotel.rating,
          amenities: hotel.amenities || [],
        }));
      } catch (error) {
        console.error('Error fetching hotels from monolith:', error);
        return [];
      }
    },
    
    hotel: async (_, { id }) => {
      try {
        const response = await axios.get(`http://hotelio-monolith-task3:8080/api/hotels/${id}`);
        const hotel = response.data;
        return {
          id: hotel.id,
          name: hotel.name,
          city: hotel.city,
          description: hotel.description,
          rating: hotel.rating,
          amenities: hotel.amenities || [],
        };
      } catch (error) {
        console.error(`Error fetching hotel ${id}:`, error);
        return null;
      }
    },
  },
  
  Hotel: {
    __resolveReference: async (reference) => {
      try {
        const response = await axios.get(`http://hotelio-monolith-task3:8080/api/hotels/${reference.id}`);
        const hotel = response.data;
        return {
          id: hotel.id,
          name: hotel.name,
          city: hotel.city,
          description: hotel.description,
          rating: hotel.rating,
          amenities: hotel.amenities || [],
        };
      } catch (error) {
        console.error(`Error resolving hotel reference ${reference.id}:`, error);
        return null;
      }
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

const port = process.env.PORT || 4002;

startStandaloneServer(server, {
  listen: { port },
}).then(({ url }) => {
  console.log(`Hotel subgraph ready at ${url}`);
});
