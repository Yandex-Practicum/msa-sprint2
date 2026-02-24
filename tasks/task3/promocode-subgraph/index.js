import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@external", "@override", "@requires"])

  extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    discountPercent: Float! @override(from: "booking-subgraph")
    discountInfo: DiscountInfo @requires(fields: "promoCode")
  }

  type DiscountInfo {
    isValid: Boolean!
    originalDiscount: Float!
    finalDiscount: Float!
    description: String
    expiresAt: String
    applicableHotels: [ID!]!
  }

  type Query {
    validatePromoCode(code: String!, hotelId: ID): DiscountInfo!
    activePromoCodes: [DiscountInfo!]!
  }
`;

const bookingSnapshot = {
  b1: { promoCode: 'WELCOME10', originalDiscount: 10, hotelId: '1' },
  b2: { promoCode: null, originalDiscount: 0, hotelId: '2' },
  b3: { promoCode: 'SPRING15', originalDiscount: 15, hotelId: '3' },
};

const promoRules = {
  WELCOME10: {
    isValid: true,
    discountPercent: 25,
    description: 'Welcome promo upgraded to 25%',
    expiresAt: '2026-12-31',
    applicableHotels: ['1', '2', '3'],
  },
  SPRING15: {
    isValid: true,
    discountPercent: 20,
    description: 'Spring campaign 20%',
    expiresAt: '2026-06-30',
    applicableHotels: ['3'],
  },
};

const buildDiscountInfo = ({ code, originalDiscount, hotelId }) => {
  const rule = code ? promoRules[code] : null;
  const isHotelApplicable = !hotelId || !rule || rule.applicableHotels.includes(hotelId);
  const isValid = Boolean(rule?.isValid && isHotelApplicable);
  const promoDiscount = isValid ? rule.discountPercent : originalDiscount;
  const finalDiscount = Math.max(originalDiscount, promoDiscount);

  return {
    isValid,
    originalDiscount,
    finalDiscount,
    description: rule?.description ?? null,
    expiresAt: rule?.expiresAt ?? null,
    applicableHotels: rule?.applicableHotels ?? [],
  };
};

const resolvers = {
  Query: {
    validatePromoCode: async (_, { code, hotelId }) =>
      buildDiscountInfo({ code, originalDiscount: 0, hotelId }),
    activePromoCodes: async () =>
      Object.entries(promoRules)
        .filter(([, rule]) => rule.isValid)
        .map(([, rule]) => ({
          isValid: true,
          originalDiscount: 0,
          finalDiscount: rule.discountPercent,
          description: rule.description,
          expiresAt: rule.expiresAt,
          applicableHotels: rule.applicableHotels,
        })),
  },
  Booking: {
    __resolveReference: async (reference) => {
      const snapshot = bookingSnapshot[reference.id] ?? {
        promoCode: null,
        originalDiscount: 0,
        hotelId: null,
      };
      const promoCode = reference.promoCode ?? snapshot.promoCode;
      const discountInfo = buildDiscountInfo({
        code: promoCode,
        originalDiscount: snapshot.originalDiscount,
        hotelId: snapshot.hotelId,
      });

      return {
        id: reference.id,
        promoCode,
        discountPercent: discountInfo.finalDiscount,
        discountInfo,
      };
    },
    discountPercent: (booking) => booking.discountPercent,
    discountInfo: (booking) => booking.discountInfo,
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4003 },
}).then(() => {
  console.log('Promocode subgraph ready at http://localhost:4003/');
});
