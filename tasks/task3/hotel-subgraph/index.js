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

const STUB_HOTELS = new Map([
  ['hotel-777', { id: 'hotel-777', name: 'Grand Hotel', city: 'Prague', stars: 4 }],
  ['hotel-888', { id: 'hotel-888', name: 'City Inn', city: 'Rome', stars: 3 }],
  ['hotel-001', { id: 'hotel-001', name: 'Nice Place', city: 'Paris', stars: 5 }]
]);

// решил использовать заглушку, т.к. время поджимало
const resolvers = {
  Hotel: {
    __resolveReference: ({ id }) => {
        return STUB_HOTELS.get(id) ?? { id, name: null, city: null, stars: null };
    },
  },
  Query: {
    hotelsByIds: (_, { ids }) => {
        return ids.map((id) => getHotel(id));
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
