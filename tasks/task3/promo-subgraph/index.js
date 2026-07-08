import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@external", "@override", "@requires"])
  {
    query: Query
  }

  type DiscountInfo {
    isValid: Boolean!
    originalDiscount: Float!
    finalDiscount: Float!
    description: String
    expiresAt: String
    applicableHotels: [ID!]!
  }

  extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    hotelId: String! @external
    discountPercent: Float! @override(from: "booking") @requires(fields: "promoCode hotelId")
    discountInfo: DiscountInfo @requires(fields: "promoCode hotelId")
  }

  type Query {
    validatePromoCode(code: String!, hotelId: ID!): DiscountInfo
    activePromoCodes: [DiscountInfo]!
  }
`;

const promoCodesDB = {
  'SUMMER': {
    isValid: true,
    originalDiscount: 10,
    finalDiscount: 10,
    description: 'Summer sale',
    expiresAt: '2026-08-31',
    applicableHotels: ['test-hotel-1', 'test-hotel-2', 'test-hotel-3'],
  },
  'VIP25': {
    isValid: true,
    originalDiscount: 15,
    finalDiscount: 25,
    description: 'VIP discount 25%',
    expiresAt: '2026-12-31',
    applicableHotels: ['test-hotel-1'],
  },
  'WELCOME': {
    isValid: true,
    originalDiscount: 5,
    finalDiscount: 20,
    description: 'Welcome offer for new users',
    expiresAt: '2026-09-30',
    applicableHotels: ['test-hotel-1', 'test-hotel-2'],
  },
};

const resolvers = {
  Query: {
    validatePromoCode: async (_, { code, hotelId }) => {
      console.log(`🎟️ Validating promo code: ${code} for hotel: ${hotelId}`);

      const promoCode = promoCodesDB[code];

      if (!promoCode) {
        console.log(`❌ Promo code not found: ${code}`);
        return {
          isValid: false,
          originalDiscount: 0,
          finalDiscount: 0,
          description: 'Invalid promo code',
          expiresAt: null,
          applicableHotels: [],
        };
      }

      if (!promoCode.applicableHotels.includes(hotelId)) {
        console.log(`❌ Promo code ${code} not applicable for hotel ${hotelId}`);
        return {
          ...promoCode,
          isValid: false,
          description: `Not applicable for hotel ${hotelId}`,
        };
      }

      console.log(`✅ Promo code valid: ${code}, discount: ${promoCode.finalDiscount}%`);
      return promoCode;
    },

    activePromoCodes: async () => {
      console.log('📋 Getting all active promo codes');
      return Object.values(promoCodesDB);
    },
  },

  Booking: {
    __resolveReference: async ({ id, promoCode, hotelId }) => {
      console.log(`📖 Resolving Booking reference for id: ${id}, promo: ${promoCode}`);
      return { id, promoCode, hotelId };
    },

    discountPercent: async (booking) => {
      if (!booking.promoCode) {
        console.log(`💰 No promo code for booking ${booking.id}, keeping original discount`);
        return booking.discountPercent || 0;
      }

      console.log(`💰 Calculating discount for promo: ${booking.promoCode} in hotel: ${booking.hotelId}`);

      const promoCode = promoCodesDB[booking.promoCode];

      if (!promoCode) {
        console.log(`❌ Invalid promo code: ${booking.promoCode}`);
        return booking.discountPercent || 0;
      }

      if (!promoCode.applicableHotels.includes(booking.hotelId)) {
        console.log(`❌ Promo not applicable for hotel: ${booking.hotelId}`);
        return booking.discountPercent || 0;
      }

      console.log(`✅ Applying discount: ${promoCode.finalDiscount}% for ${booking.promoCode}`);
      return promoCode.finalDiscount;
    },

    discountInfo: async (booking) => {
      if (!booking.promoCode) {
        console.log(`ℹ️ No promo code for booking ${booking.id}`);
        return {
          isValid: false,
          originalDiscount: booking.discountPercent || 0,
          finalDiscount: booking.discountPercent || 0,
          description: 'No promo code applied',
          expiresAt: null,
          applicableHotels: [],
        };
      }

      console.log(`ℹ️ Getting discount info for promo: ${booking.promoCode}`);

      const promoCode = promoCodesDB[booking.promoCode];

      if (!promoCode || !promoCode.applicableHotels.includes(booking.hotelId)) {
        return {
          isValid: false,
          originalDiscount: booking.discountPercent || 0,
          finalDiscount: booking.discountPercent || 0,
          description: 'Promo code not applicable',
          expiresAt: null,
          applicableHotels: [],
        };
      }

      return {
        isValid: true,
        originalDiscount: booking.discountPercent || 0,
        finalDiscount: promoCode.finalDiscount,
        description: promoCode.description,
        expiresAt: promoCode.expiresAt,
        applicableHotels: promoCode.applicableHotels,
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
  console.log('✅ PromoCode subgraph ready at http://localhost:4003/');
  console.log('🎟️ Available promo codes:', Object.keys(promoCodesDB).join(', '));
});
