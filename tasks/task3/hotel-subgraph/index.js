import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  type Hotel @key(fields: "id") {
    id: ID!
    operational: Boolean!
    fullyBooked: Boolean!
    city: String!
    rating: Float!
    description: String!
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]
  }
`;

const resolvers = {
    Hotel: {
        __resolveReference: async ({ id }) => {
            try {
                const response = await fetch(`http://monolith:8084/api/hotels/${id}`);

                if (!response.ok) {
                    return null; // Если отель не найден или монолит упал
                }

                const hotel = await response.json();
                return hotel;
            } catch (error) {
                console.error("Ошибка при запросе отеля:", error);
                return null;
            }
        },
    },
    Query: {
        hotelsByIds: async (_, { ids }) => {
            try {
                const requests = ids.map(id =>
                    fetch(`http://monolith:8084/api/hotels/${id}`)
                        .then(res => res.ok ? res.json() : null)
                        .catch(() => null)
                );

                const hotels = await Promise.all(requests);

                return hotels.filter(h => h !== null);
            } catch (error) {
                console.error("Ошибка при массовом запросе отелей:", error);
                return [];
            }
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
