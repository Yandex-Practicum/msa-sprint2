import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const MONOLITH = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';

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

const getHotel = async (id) => {
  const r = await fetch(`${MONOLITH}/api/hotels/${encodeURIComponent(id)}`);
  if (!r.ok) return null;
  const h = await r.json();
  console.log(`hotel ${id} loaded from monolith`);
  return { id: h.id, name: h.name ?? h.description, city: h.city, stars: Math.round(h.rating ?? 0) };
};

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => getHotel(id),
  },
  Query: {
    hotelsByIds: async (_, { ids }) => Promise.all(ids.map(getHotel)),
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
