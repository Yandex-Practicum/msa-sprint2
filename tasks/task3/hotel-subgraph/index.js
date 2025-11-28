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
const url = "localhost:8084/api/hotels/"

async function getHotelInfo(id) {
  const response = await fetch(url + id, {
    method: 'Get',
  });
  const responseData = await response.json();
  return responseData.Map((i) => {
    return ({
      id: i.Id,
      name: i.name,
      city: i.city,
      stars: i.rating,
    });
  });
}

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      return getHotelInfo(id)
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }) => {
      return ids.map((i)=>{
        return getHotelInfo(i);
      });
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
