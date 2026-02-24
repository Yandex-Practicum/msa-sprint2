import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

  enum BookingStatus {
    CONFIRMED
    CANCELLED
    COMPLETED
  }

  type Booking @key(fields: "id") {
    id: ID!
    userId: ID!
    hotelId: ID!
    hotel: Hotel
    promoCode: String
    discountPercent: Float!
    checkIn: String!
    checkOut: String!
    status: BookingStatus!
  }

  type Hotel @key(fields: "id") {
    id: ID!
  }

  type Query {
    userBookings(userId: ID!): [Booking!]!
    booking(id: ID!): Booking
    bookingsByUser(userId: String!): [Booking]
  }

`;

const mockBookings = [
  {
    id: 'b1',
    userId: 'u1',
    hotelId: '1',
    promoCode: 'WELCOME10',
    discountPercent: 10,
    checkIn: '2026-03-10',
    checkOut: '2026-03-15',
    status: 'CONFIRMED',
  },
  {
    id: 'b2',
    userId: 'u1',
    hotelId: '2',
    promoCode: null,
    discountPercent: 0,
    checkIn: '2026-04-01',
    checkOut: '2026-04-05',
    status: 'CONFIRMED',
  },
  {
    id: 'b3',
    userId: 'u2',
    hotelId: '3',
    promoCode: 'SPRING15',
    discountPercent: 15,
    checkIn: '2026-05-20',
    checkOut: '2026-05-23',
    status: 'COMPLETED',
  },
];

const isAllowed = (req, ownerUserId) => {
  const requesterUserId = req?.headers?.['x-user-id'] ?? req?.headers?.userid;
  const requesterRole = req?.headers?.['x-role'];
  return requesterRole === 'admin' || String(requesterUserId) === String(ownerUserId);
};

const resolvers = {
  Query: {
    userBookings: async (_, { userId }, { req }) => {
      console.log('[booking] userBookings', {
        userId,
        requester: req?.headers?.['x-user-id'] ?? req?.headers?.userid ?? null,
        role: req?.headers?.['x-role'] ?? null,
      });
      if (!isAllowed(req, userId)) {
        throw new Error('Forbidden');
      }

      return mockBookings.filter((booking) => booking.userId === userId);
    },
    booking: async (_, { id }, { req }) => {
      console.log('[booking] booking', {
        id,
        requester: req?.headers?.['x-user-id'] ?? req?.headers?.userid ?? null,
        role: req?.headers?.['x-role'] ?? null,
      });
      const booking = mockBookings.find((item) => item.id === id);
      if (!booking) return null;
      if (!isAllowed(req, booking.userId)) {
        throw new Error('Forbidden');
      }
      return booking;
    },
    bookingsByUser: async (_, { userId }, { req }) => {
      console.log('[booking] bookingsByUser', {
        userId,
        requester: req?.headers?.['x-user-id'] ?? req?.headers?.userid ?? null,
        role: req?.headers?.['x-role'] ?? null,
      });
      if (!isAllowed(req, userId)) {
        throw new Error('Forbidden');
      }
      return mockBookings.filter((booking) => booking.userId === userId);
    },
  },
  Booking: {
    hotel: (booking) => ({ __typename: 'Hotel', id: booking.hotelId }),
    __resolveReference: async ({ id }, { req }) => {
      const booking = mockBookings.find((item) => item.id === id);

      if (!booking) {
        return null;
      }

      if (!isAllowed(req, booking.userId)) {
        return null;
      }

      return booking;
    },
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
