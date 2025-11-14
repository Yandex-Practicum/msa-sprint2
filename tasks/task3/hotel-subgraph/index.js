import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

// ======== Типы ========
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

// ======== Заглушка данных ========
const hotels = [
  { id: 'h1', name: 'Grand Plaza', city: 'Paris', stars: 5 },
  { id: 'h2', name: 'City Inn', city: 'Berlin', stars: 3 },
  { id: 'h3', name: 'Sea Breeze', city: 'Barcelona', stars: 4 },
];

// ======== Резолверы ========
const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      // тут мог бы быть REST или gRPC вызов
      return hotels.find((h) => h.id === id);
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }) => {
      return hotels.filter((h) => ids.includes(h.id));
    },
  },
};

// ======== Сервер ========
const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
}).then(() => {
  console.log('✅ Hotel subgraph ready at http://localhost:4002/');
});
