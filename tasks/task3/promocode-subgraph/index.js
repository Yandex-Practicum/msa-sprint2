import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.0"
      import: ["@key", "@external", "@requires", "@override"]
    )

  extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    discountPercent: Float @override(from: "booking") @requires(fields: "promoCode")
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

// GET /api/promos/{code} - PromoCode
async function fetchPromoInfo(code) {
  if (!code) {
    return {
      isValid: false,
      originalDiscount: 0,
      finalDiscount: 0,
      description: null,
      expiresAt: null,
      applicableHotels: [],
    };
  }
  try {
    const res = await fetch(
      `${MONOLITH_URL}/api/promos/${encodeURIComponent(code)}`
    );
    if (!res.ok) {
      return {
        isValid: false,
        originalDiscount: 0,
        finalDiscount: 0,
        description: null,
        expiresAt: null,
        applicableHotels: [],
      };
    }
    const promo = await res.json();
    const isValid = !promo.expired && promo.discount > 0;
    return {
      isValid,
      originalDiscount: promo.discount ?? 0,
      finalDiscount: isValid ? (promo.discount ?? 0) : 0,
      description: promo.description ?? null,
      expiresAt: promo.validUntil ?? null,
      applicableHotels: [],
    };
  } catch {
    return {
      isValid: false,
      originalDiscount: 0,
      finalDiscount: 0,
      description: null,
      expiresAt: null,
      applicableHotels: [],
    };
  }
}

const resolvers = {
  Booking: {
    __resolveReference: (ref) => ref,

    discountPercent: async ({ promoCode }) => {
      const info = await fetchPromoInfo(promoCode);
      return info.finalDiscount;
    },

    discountInfo: async ({ promoCode }) => {
      return fetchPromoInfo(promoCode);
    },
  },

  Query: {
    validatePromoCode: async (_, { code }) => {
      return fetchPromoInfo(code);
    },

    activePromoCodes: async () => {
      return [];
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4003 },
});

console.log(`✅ Promocode subgraph ready at ${url}`);
