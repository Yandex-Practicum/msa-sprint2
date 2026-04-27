import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';

const fallbackBookings = [
  {
    id: 'demo-b1',
    userId: 'user1',
    hotelId: 'test-hotel-1',
    promoCode: 'TESTCODE1',
    discountPercent: 10,
    price: 90,
    createdAt: '2026-04-27T00:00:00.000Z',
  },
  {
    id: 'demo-b2',
    userId: 'user1',
    hotelId: 'test-hotel-2',
    promoCode: 'TESTCODE-VIP',
    discountPercent: 20,
    price: 60,
    createdAt: '2026-04-27T00:05:00.000Z',
  },
  {
    id: 'demo-b3',
    userId: 'user2',
    hotelId: 'test-hotel-1',
    promoCode: null,
    discountPercent: 0,
    price: 100,
    createdAt: '2026-04-27T00:10:00.000Z',
  },
];

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.3"
      import: ["@key"]
    )

  type Hotel @key(fields: "id", resolvable: false) {
    id: ID!
  }

  type Booking @key(fields: "id") {
    id: ID!
    userId: ID!
    hotelId: ID!
    promoCode: String
    discountPercent: Float
    price: Float
    createdAt: String
    hotel: Hotel
  }

  type Query {
    bookingsByUser(userId: ID!): [Booking!]!
    userBookings(userId: ID!): [Booking!]!
    booking(id: ID!): Booking
  }
`;

function assertCanReadUser(userId, req) {
  const currentUserId = req?.headers?.userid;
  if (!currentUserId || currentUserId !== userId) {
    console.log(`ACL deny: header userid=${currentUserId || '<missing>'}, requested userId=${userId}`);
    return false;
  }
  console.log(`ACL allow: userid=${currentUserId}`);
  return true;
}

function normalizeBooking(raw) {
  return {
    id: String(raw.id),
    userId: raw.userId ?? raw.user_id,
    hotelId: raw.hotelId ?? raw.hotel_id,
    promoCode: raw.promoCode ?? raw.promo_code ?? null,
    discountPercent: Number(raw.discountPercent ?? raw.discount_percent ?? 0),
    price: Number(raw.price ?? 0),
    createdAt: raw.createdAt ?? raw.created_at ?? null,
  };
}

async function fetchBookingsFromMonolith(userId) {
  console.log(`Loading bookings from monolith REST for userId=${userId}`);
  const response = await fetch(`${MONOLITH_URL}/api/bookings?userId=${encodeURIComponent(userId)}`);
  if (!response.ok) {
    throw new Error(`Booking REST API returned ${response.status}`);
  }
  const body = await response.json();
  return body.map(normalizeBooking);
}

async function loadBookingsByUser(userId) {
  try {
    return await fetchBookingsFromMonolith(userId);
  } catch (error) {
    console.log(`Booking REST API is unavailable, using demo bookings: ${error.message}`);
  }

  return fallbackBookings
    .filter((booking) => booking.userId === userId)
    .map(normalizeBooking);
}

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      if (!assertCanReadUser(userId, req)) {
        return [];
      }
      return loadBookingsByUser(userId);
    },
    userBookings: async (_, { userId }, { req }) => {
      if (!assertCanReadUser(userId, req)) {
        return [];
      }
      return loadBookingsByUser(userId);
    },
    booking: async (_, { id }, { req }) => {
      const currentUserId = req?.headers?.userid;
      if (!currentUserId) {
        return null;
      }
      const bookings = await loadBookingsByUser(currentUserId);
      return bookings.find((booking) => booking.id === id) || null;
    },
  },
  Booking: {
    __resolveReference: async ({ id }, { req }) => {
      const currentUserId = req?.headers?.userid;
      if (!currentUserId) {
        return null;
      }
      const bookings = await loadBookingsByUser(currentUserId);
      return bookings.find((booking) => booking.id === id) || null;
    },
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
