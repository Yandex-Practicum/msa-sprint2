import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const promoRules = {
  TESTCODE1: {
    isValid: true,
    finalDiscount: 10,
    description: 'Test promo 10%',
    expiresAt: '2026-12-31',
    applicableHotels: ['test-hotel-1'],
  },
  SUMMER: {
    isValid: true,
    finalDiscount: 25,
    description: 'Summer promo 25%',
    expiresAt: '2026-08-31',
    applicableHotels: ['h1', 'h2'],
  },
  VIP: {
    isValid: true,
    finalDiscount: 30,
    description: 'VIP promo 30%',
    expiresAt: '2026-12-31',
    applicableHotels: ['h1'],
  },
};

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.7",
      import: ["@key", "@external", "@override", "@requires"]
    )

  extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    hotelId: String! @external
    discountPercent: Int @override(from: "booking")
    discountInfo: DiscountInfo @requires(fields: "promoCode hotelId")
  }

  type DiscountInfo {
    isValid: Boolean!
    originalDiscount: Int!
    finalDiscount: Int!
    description: String
    expiresAt: String
    applicableHotels: [ID!]!
  }

  type Query {
    validatePromoCode(code: String!, hotelId: ID): DiscountInfo!
    activePromoCodes: [DiscountInfo!]!
  }
`;

const resolvers = {
  Query: {
    validatePromoCode: (_, { code, hotelId }) => {
      const promo = promoRules[code];

      if (!promo) {
        return {
          isValid: false,
          originalDiscount: 0,
          finalDiscount: 0,
          description: 'Promo code not found',
          expiresAt: null,
          applicableHotels: [],
        };
      }

      const valid = !hotelId || promo.applicableHotels.includes(hotelId);

      return {
        isValid: valid,
        originalDiscount: 0,
        finalDiscount: valid ? promo.finalDiscount : 0,
        description: promo.description,
        expiresAt: promo.expiresAt,
        applicableHotels: promo.applicableHotels,
      };
    },

    activePromoCodes: () => {
      return Object.values(promoRules).map((promo) => ({
        isValid: true,
        originalDiscount: 0,
        finalDiscount: promo.finalDiscount,
        description: promo.description,
        expiresAt: promo.expiresAt,
        applicableHotels: promo.applicableHotels,
      }));
    },
  },

  Booking: {
    discountPercent: (booking) => {
      if (!booking.promoCode) {
        return booking.discountPercent ?? 0;
      }

      const promo = promoRules[booking.promoCode];
      if (!promo) {
        return booking.discountPercent ?? 0;
      }

      if (
        booking.hotelId &&
        promo.applicableHotels.length > 0 &&
        !promo.applicableHotels.includes(booking.hotelId)
      ) {
        return booking.discountPercent ?? 0;
      }

      return promo.finalDiscount;
    },

    discountInfo: (booking) => {
      const originalDiscount = booking.discountPercent ?? 0;

      if (!booking.promoCode) {
        return {
          isValid: false,
          originalDiscount,
          finalDiscount: originalDiscount,
          description: 'No promo code',
          expiresAt: null,
          applicableHotels: [],
        };
      }

      const promo = promoRules[booking.promoCode];

      if (!promo) {
        return {
          isValid: false,
          originalDiscount,
          finalDiscount: originalDiscount,
          description: 'Promo code not found',
          expiresAt: null,
          applicableHotels: [],
        };
      }

      const validForHotel =
        !booking.hotelId || promo.applicableHotels.includes(booking.hotelId);

      return {
        isValid: validForHotel,
        originalDiscount,
        finalDiscount: validForHotel ? promo.finalDiscount : originalDiscount,
        description: promo.description,
        expiresAt: promo.expiresAt,
        applicableHotels: promo.applicableHotels,
      };
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4003 },
}).then(() => {
  console.log('✅ Promocode subgraph ready at http://localhost:4003/');
});