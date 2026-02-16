import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import { createPromocodeLoader } from './promocode_loader/promocode_loader.js';

const PROMOCODE_SERVICE_URL = process.env.PROMOCODE_SERVICE_URL;

const typeDefs = gql`
  extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    discountInfo: DiscountInfo @requires(fields: "promoCode")
  }
  
  type DiscountInfo {
    expired: Boolean!
    Discount: Float!
    description: String
    expiresAt: String
  }
  
  type Query {
    validatePromoCode(code: String!, hotelId: ID): DiscountInfo!
    activePromoCodes: [DiscountInfo!]!
  }
  
`;

const resolvers = {
  Booking: {
    async discountInfo(booking, _, { promoLoader }) {
      if (!booking.promoCode) return null;
      return promoLoader.load(booking.promoCode);
    },
  },

  Query: {
    async validatePromoCode(_, { code, hotelId }) {
      const res = await fetch(
        `${PROMOCODE_SERVICE_URL}/api/promos/${code}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotelId }),
        }
      );

      if (!res.ok) {
        throw new Error('Promo code validation failed');
      }

      const promo = await res.json();

      return {
        expired: promo.expired,
        Discount: promo.discount,
        description: promo.description,
        expiresAt: promo.validUntil,
      };
    },

    async activePromoCodes() {
      const res = await fetch(`${PROMOCODE_SERVICE_URL}/api/promos`);

      if (!res.ok) return [];

      const promos = await res.json();

      return promos
        .filter(p => !p.expired)
        .map(p => ({
          expired: p.expired,
          Discount: p.discount,
          description: p.description,
          expiresAt: p.validUntil,
        }));
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4003 },
  context: async () => ({
    promoLoader: createPromocodeLoader(),
  }),
}).then(() => {
  console.log('✅ Hotel subgraph ready at http://localhost:4003/');
});
