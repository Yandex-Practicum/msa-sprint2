import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const promoCodesData = [
  {
    code: 'SUMMER2024',
    discountPercent: 25,
    description: 'Летняя распродажа',
    expiresAt: '2027-12-31T23:59:59Z',
    applicableHotels: ['1', '2', '3'],
    isActive: true,
  },
  {
    code: 'WELCOME10',
    discountPercent: 10,
    description: 'Скидка для новых пользователей',
    expiresAt: '2027-12-31T23:59:59Z',
    applicableHotels: ['1', '2', '3', '4', '5'],
    isActive: true,
  }
];

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.5",
          import: ["@key", "@external", "@override", "@requires"])

  extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    discountPercent: Float @override(from: "booking")
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

const resolvers = {
  Query: {
    validatePromoCode: (_, { code, hotelId }) => {
      const promo = promoCodesData.find(p => p.code === code);
      if (!promo) {
        return {
          isValid: false,
          originalDiscount: 0,
          finalDiscount: 0,
          description: 'Промокод не найден',
          applicableHotels: [],
        };
      }
      return {
        isValid: promo.isActive,
        originalDiscount: promo.discountPercent,
        finalDiscount: promo.discountPercent,
        description: promo.description,
        expiresAt: promo.expiresAt,
        applicableHotels: promo.applicableHotels,
      };
    },
    activePromoCodes: () => {
      return promoCodesData.map(promo => ({
        isValid: promo.isActive,
        originalDiscount: promo.discountPercent,
        finalDiscount: promo.discountPercent,
        description: promo.description,
        expiresAt: promo.expiresAt,
        applicableHotels: promo.applicableHotels,
      }));
    },
  },
  Booking: {
    __resolveReference: (reference) => reference,
    discountPercent: (booking) => {
      const promo = promoCodesData.find(p => p.code === booking.promoCode);
      return promo ? promo.discountPercent : 0;
    },
    discountInfo: (booking) => {
      const promo = promoCodesData.find(p => p.code === booking.promoCode);
      if (!promo) return null;
      return {
        isValid: promo.isActive,
        originalDiscount: promo.discountPercent,
        finalDiscount: promo.discountPercent,
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

startStandaloneServer(server, { listen: { port: 4003 } }).then(({ url }) => {
  console.log(`✅ Promocode subgraph ready at ${url}`);
});