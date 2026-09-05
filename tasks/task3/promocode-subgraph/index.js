import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { RestClient } from './rest-client.js';
import NodeCache from 'node-cache';
import gql from 'graphql-tag';

const typeDefs = gql`
  schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", 
          import: ["@override", "@requires", "@key", "@external" ]
          )
      {
        query: Query
      }
  type PromoCode @key(fields: "code") {
    code: String!
    discount: Float
    vipOnly: Boolean
    expired: Boolean
    validUntil: String
    isValid: Boolean
    description: String
  }

  type DiscountInfo {
    isValid: Boolean!
    originalDiscount: Float!    # Исходное значение из booking
    finalDiscount: Float!       # Актуальное значение после проверки
    description: String
    expiresAt: String
  } 

  extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    discountPercent: Float @override(from: "booking") @requires(fields: "promoCode")  # ПЕРЕОПРЕДЕЛЯЕМ значение из booking-subgraph
    discountInfo: DiscountInfo @requires(fields: "promoCode")
  } 

  type Query {
    promosByCodes(codes: [ID!]!): [PromoCode]
    validatePromoCode(code: String!, userId: ID): DiscountInfo!
  }
`;

var monolithClient = new RestClient('http://monolith:8080/api');

// In-memory cache for Promocodes (by id).
// stdTTL: 300s (5 min) expiration, checkperiod: 60s cleanup interval.
const promoCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

function convertToDiscountInfo(promo) {
  if (!promo)
    return null;
  else
    return {
      isValid: promo?.isValid ?? false,
      originalDiscount: promo?.discount ?? 0,
      finalDiscount: promo?.isValid ? (promo.discount ?? 0) : 0,
      description: promo?.description ?? "",
      expiresAt: promo?.validUntil ?? null,
    };
}

async function getPromoByPromocode(code) {
  const cached = promoCache.get(code);
  if (cached) {
    console.log('Cache hit for promo ' + code);
    return cached;
  }

  const promoJson = await monolithClient.fetch('/promos/' + code);
  console.log('Got promo: ' + JSON.stringify(promoJson));
  if (promoJson) {
    promoCache.set(code, promoJson);
    console.log('Cached promo ' + code);
  }
  return promoJson;
}

const resolvers = {
  // PromoCode: {
  //   __resolveReference: async ({ id }) => {
  //     console.log('Resolve PromoCode ' + id);
  //     if (!id) return null;
  //     return await getPromoByPromocode(id);
  //   },
  // },
  // DiscountInfo: {
  //   __resolveReference: async ({ id }) => {
  //     console.log('Resolve Discount ' + id);
  //     if (!id) return null;
  //     return await convertToDiscountInfo(getPromoByPromocode(id));
  //   },
  // },
  Booking: {
    __resolveReference: async (ref) => ref,

    discountPercent: async (booking) => {
      if (!booking.promoCode) return 0.0;
      const promo = await getPromoByPromocode(booking.promoCode);
      return promo?.discount ?? 0.0;
    },

    discountInfo: async (booking) => {
      if (!booking.promoCode) return convertToDiscountInfo(null);
      const promo = await getPromoByPromocode(booking.promoCode);
      return convertToDiscountInfo(promo);
    },
  },

  Query: {
    promosByCodes: async (_, { codes }) => {
      console.log("promosByIds");

      if (!codes) return [];

      var promos = Array();
      for (const code of codes) {
        try {
          var promo = await getPromoByPromocode(code);
          if (promo)
            promos.push(promo);
        }
        catch (error) {
          console.error(`Could not load promo for Id: ${code}. Error: ${error}`);
        }
      };

      console.log('Got promos: ' + JSON.stringify(promos));
      return promos;
    },
    validatePromoCode: async (_, { code, userId }) => {
      const promoJson = await monolithClient.fetchNoThrow(
        `/promos/validate?code=${code}&userId=${userId}`,
        { method: 'POST' }
      );

      return convertToDiscountInfo(promoJson) || {
        isValid: false,
        originalDiscount: 0,
        finalDiscount: 0,
        description: "",
        expiresAt: null,
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
});