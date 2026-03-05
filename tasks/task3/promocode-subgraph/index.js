import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://localhost:8080';

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.0"
      import: ["@key", "@external", "@requires", "@override"]
    )

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
    discountPercent: Float @override(from: "booking")
    discountInfo: DiscountInfo @requires(fields: "promoCode")
  }

  type Query {
    validatePromoCode(code: String!, hotelId: ID): DiscountInfo!
    activePromoCodes: [DiscountInfo!]!
  }
`;

async function fetchPromo(promoCode) {
  if (!promoCode) return null;
  const res = await fetch(`${MONOLITH_URL}/api/promos/${promoCode}`);
  if (!res.ok) return null;
  return res.json();
}

function buildDiscountInfo(promo) {
  if (!promo) {
    return {
      isValid: false,
      originalDiscount: 0,
      finalDiscount: 0,
      description: null,
      expiresAt: null,
      applicableHotels: [],
    };
  }
  const isValid = !promo.expired;
  return {
    isValid,
    originalDiscount: promo.discount ?? 0,
    finalDiscount: isValid ? (promo.discount ?? 0) : 0,
    description: promo.description ?? null,
    expiresAt: promo.validUntil ?? null,
    applicableHotels: [],
  };
}

const resolvers = {
  Booking: {
    __resolveReference: (ref) => ref,

    discountPercent: async (booking) => {
      const promo = await fetchPromo(booking.promoCode);
      if (!promo || promo.expired) return 0;
      return promo.discount ?? 0;
    },

    discountInfo: async (booking) => {
      const promo = await fetchPromo(booking.promoCode);
      return buildDiscountInfo(promo);
    },
  },

  Query: {
    validatePromoCode: async (_, { code }) => {
      const promo = await fetchPromo(code);
      return buildDiscountInfo(promo);
    },

    activePromoCodes: async () => {
      // Returns known promo codes from fixtures (SUMMER20, VIP50)
      const codes = ['SUMMER20', 'VIP50'];
      const results = await Promise.all(
        codes.map(async (code) => {
          const promo = await fetchPromo(code);
          return buildDiscountInfo(promo);
        })
      );
      return results.filter((d) => d.isValid);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4003 },
  context: async ({ req }) => ({ req }),
}).then(() => {
  console.log('✅ Promocode subgraph ready at http://localhost:4003/');
  console.log(`   Monolith URL: ${MONOLITH_URL}`);
});
