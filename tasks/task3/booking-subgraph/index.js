import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

// ---------------------------------------------------------------------------
// Реальный источник броней — монолит Hotelio (REST). Монолит (задание 2)
// сам проксирует список бронирований в gRPC booking-service, поэтому этот
// вызов возвращает актуальные данные нового booking-сервиса.
// GET {MONOLITH_URL}/api/bookings?userId=...
// ---------------------------------------------------------------------------
const MONOLITH_URL = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@external"])

  type Booking @key(fields: "id") {
    id: ID!
    userId: ID!
    hotelId: ID!
    promoCode: String
    discountPercent: Float
    hotel: Hotel
  }

  extend type Hotel @key(fields: "id") {
    id: ID! @external
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

const resolvers = {
  Query: {
    // ACL: пользователь видит только свои бронирования.
    // Заголовок userid передаётся из Gateway в субграф автоматически.
    bookingsByUser: async (_, { userId }, { req }) => {
      const headerUserId = req?.headers?.['userid'];
      console.log(`[booking-subgraph] bookingsByUser(userId=${userId}) header userid=${headerUserId}`);
      if (!headerUserId || headerUserId !== userId) {
        console.log(`[booking-subgraph] ACL deny: header userid (${headerUserId}) != requested (${userId})`);
        return [];
      }
      const bookings = await fetchJson(`${MONOLITH_URL}/api/bookings?userId=${encodeURIComponent(userId)}`);
      console.log(`[booking-subgraph] GET /api/bookings?userId=${userId} -> ${Array.isArray(bookings) ? bookings.length : 'err'}`);
      return (Array.isArray(bookings) ? bookings : []).map((b) => ({
        id: String(b.id),
        userId: b.userId,
        hotelId: b.hotelId,
        promoCode: b.promoCode || null,
        discountPercent: b.discountPercent ?? 0,
      }));
    },
  },
  Booking: {
    // Ссылка на отель; наполняет hotel-subgraph.
    hotel: (booking) => ({ __typename: 'Hotel', id: booking.hotelId }),
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
