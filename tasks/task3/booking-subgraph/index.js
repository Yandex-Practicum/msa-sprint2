import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }

  extend type Hotel @key(fields: "id") {
    id: ID! @external
  }

  extend type Booking @key(fields: "id") {
    hotel: Hotel!
  }
`;

async function fetchUserBookings(userId) {
    const reqUrl = `http://host.docker.internal:8084/api/bookings?userId=${userId}`;
    const response = await fetch(reqUrl);
    const userBookings = await response.json();

    return userBookings;
}

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
        if (!userId) {
            return null;
        }

        return await fetchUserBookings(userId);
    },
  },
  Booking: {
    hotel: booking => ({__typename: 'Hotel', id: booking.hotelId}),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => ({ req }),
}).then(() => {
  console.log('✅ Booking subgraph ready at http://localhost:4001/');
});
