import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLError } from 'graphql';
import gql from 'graphql-tag';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://monolith:8080';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key"])

  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    hotel: Hotel        # <-- вот это поле должно появиться
    promoCode: String
    discountPercent: Float
  }

  # Объявляем тип Hotel в booking-subgraph, чтобы Federation знала о его существовании
  type Hotel @key(fields: "id") {
    id: ID!
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { user }) => {
      // ---------- ACL ----------
      if (!user) {
        throw new GraphQLError('Не передан заголовок userid', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      if (user.id !== userId) {
        throw new GraphQLError('Можно просматривать только свои бронирования', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      // ---------- Вызов к монолиту ----------
      const res = await fetch(
        `${MONOLITH_URL}/api/bookings?userId=${encodeURIComponent(userId)}`
      );
      if (!res.ok) {
        throw new GraphQLError(`Монолит вернул статус ${res.status}`, {
          extensions: { code: 'UPSTREAM_ERROR' },
        });
      }
      const bookings = await res.json();

      return bookings.map((b) => ({
        id: b.bookingId,
        userId: b.userId,
        hotelId: b.hotelId,
        promoCode: b.promoCode ?? null,
        discountPercent: b.discountPercent ?? 0,
      }));
    },
  },
  Booking: {
    // Ключевой резолвер: говорим Федерации, как связать бронь с отелем
    hotel: (booking) => ({ __typename: 'Hotel', id: booking.hotelId }),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => {
    const userid =
      (typeof req.headers.get === 'function' && req.headers.get('userid')) ||
      req.headers['userid'];
    return { user: userid ? { id: userid } : null };
  },
}).then(() => {
  console.log('✅ Booking subgraph ready at http://localhost:4001/');
});