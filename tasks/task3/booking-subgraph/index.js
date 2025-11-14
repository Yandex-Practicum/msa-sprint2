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
    hotel: Hotel
  }

  extend type Hotel @key(fields: "id") {
    id: ID! @external
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

const bookings = [
  { id: "b1", userId: "u1", hotelId: "h1", promoCode: "WINTER", discountPercent: 10 },
  { id: "b2", userId: "u1", hotelId: "h2", promoCode: "SPRING", discountPercent: 5 },
  { id: "b3", userId: "u2", hotelId: "h3", promoCode: "SUMMER", discountPercent: 15 }
];

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { user }) => {
      console.log(`➡️  [bookingsByUser] userId param: ${userId}, auth user: ${user?.id}`);

      if (!user || user.id !== userId) {
        console.error('❌ Access denied: you can only view your own bookings');
        throw new Error('Access denied: you can only view your own bookings');
      }

      const result = bookings.filter((b) => b.userId === userId);
      console.log(`✅ Returning ${result.length} bookings for user ${userId}`);
      return result;
    },
  },
  Booking: {
    hotel: (booking) => ({ __typename: "Hotel", id: booking.hotelId }),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => {
    // логируем заголовки
    console.log('📥 Incoming request headers:', req.headers);

    // парсим авторизацию
    const auth = req.headers.authorization || '';
    const user = auth.startsWith('Bearer ')
      ? { id: auth.replace('Bearer ', '') }
      : null;

    console.log(`👤 Authenticated user: ${user ? user.id : 'none'}`);

    return { user };
  },
}).then(() => {
  console.log('✅ Booking subgraph ready at http://localhost:4001/');
});
