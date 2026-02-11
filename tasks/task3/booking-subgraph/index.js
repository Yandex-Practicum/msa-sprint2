import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLError } from 'graphql';
import gql from 'graphql-tag';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';

function log(level, msg, extra = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }));
}

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: ID!
    hotelId: ID!
    hotel: Hotel
    promoCode: String
    discountPercent: Float
  }

  type Hotel @key(fields: "id") {
    id: ID!
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
    booking(id: ID!): Booking
  }
`;

async function fetchUserBookings(userId) {
  log('info', 'fetchUserBookings → monolith', { userId });
  const res = await fetch(
    `${MONOLITH_URL}/api/bookings?userId=${encodeURIComponent(userId)}`
  );
  if (!res.ok) {
    log('error', 'monolith error', { userId, status: res.status });
    throw new Error(`Monolith error: ${res.status}`);
  }
  const data = await res.json();
  log('info', 'fetchUserBookings ← monolith', { userId, count: data.length });
  return data.map(b => ({
    id: String(b.id),
    userId: b.userId,
    hotelId: b.hotelId,
    promoCode: b.promoCode ?? null,
    discountPercent: b.discountPercent ?? 0,
  }));
}

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      const requestingUser = req.headers['userid'];
      log('info', 'bookingsByUser', { userId, requestingUser });
      if (!requestingUser || requestingUser !== userId) {
        log('warn', 'ACL denied: bookingsByUser', { requestingUser, userId });
        throw new GraphQLError('Access denied: you can only view your own bookings', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return fetchUserBookings(userId);
    },

    booking: async (_, { id }, { req }) => {
      const requestingUser = req.headers['userid'];
      log('info', 'booking', { id, requestingUser });
      const res = await fetch(`${MONOLITH_URL}/api/bookings?userId=`);
      if (!res.ok) return null;
      const all = await res.json();
      const b = all.find(x => String(x.id) === String(id));
      if (!b) {
        log('warn', 'booking not found', { id });
        return null;
      }
      if (!requestingUser || requestingUser !== b.userId) {
        log('warn', 'ACL denied: booking', { requestingUser, ownerId: b.userId, id });
        throw new GraphQLError('Access denied', { extensions: { code: 'FORBIDDEN' } });
      }
      return {
        id: String(b.id),
        userId: b.userId,
        hotelId: b.hotelId,
        promoCode: b.promoCode ?? null,
        discountPercent: b.discountPercent ?? 0,
      };
    },
  },

  Booking: {
    hotel: (booking) => {
      log('info', 'Booking.hotel ref', { bookingId: booking.id, hotelId: booking.hotelId });
      return { __typename: 'Hotel', id: booking.hotelId };
    },

    __resolveReference: async ({ id }) => {
      log('info', 'Booking.__resolveReference', { id });
      const res = await fetch(`${MONOLITH_URL}/api/bookings?userId=`);
      if (!res.ok) return null;
      const all = await res.json();
      const b = all.find(x => String(x.id) === String(id));
      if (!b) return null;
      return {
        id: String(b.id),
        userId: b.userId,
        hotelId: b.hotelId,
        promoCode: b.promoCode ?? null,
        discountPercent: b.discountPercent ?? 0,
      };
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => ({ req }),
});

console.log(`✅ Booking subgraph ready at ${url}`);
