import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@external", "@requires", "@override"])

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

// Мок-база промокодов для демонстрации
const promoCodesDB = {
  'SUMMER2024': {
    isValid: true,
    originalDiscount: 10,
    finalDiscount: 25,
    description: 'Летняя акция - увеличенная скидка!',
    expiresAt: '2026-12-31',
    applicableHotels: ['hotel-777', 'hotel-888', 'hotel-999']
  },
  'WINTER2025': {
    isValid: true,
    originalDiscount: 5,
    finalDiscount: 15,
    description: 'Зимняя распродажа',
    expiresAt: '2026-03-31',
    applicableHotels: ['hotel-555', 'hotel-666']
  }
};

const resolvers = {
  Booking: {
    // Переопределяем discountPercent из promocode-subgraph
    discountPercent: (booking) => {
      if (booking.promoCode && promoCodesDB[booking.promoCode]) {
        return promoCodesDB[booking.promoCode].finalDiscount;
      }
      return booking.discountPercent || 0;
    },
    
    // Резолвим discountInfo на основе promoCode
    discountInfo: (booking) => {
      if (!booking.promoCode) {
        return {
          isValid: false,
          originalDiscount: 0,
          finalDiscount: 0,
          description: 'Промокод не применен',
          expiresAt: null,
          applicableHotels: []
        };
      }
      
      const promo = promoCodesDB[booking.promoCode];
      if (!promo) {
        return {
          isValid: false,
          originalDiscount: 0,
          finalDiscount: 0,
          description: 'Промокод не найден',
          expiresAt: null,
          applicableHotels: []
        };
      }
      
      return promo;
    }
  },
  
  Query: {
    validatePromoCode: (_, { code, hotelId }) => {
      const promo = promoCodesDB[code];
      
      if (!promo) {
        return {
          isValid: false,
          originalDiscount: 0,
          finalDiscount: 0,
          description: 'Промокод не найден',
          expiresAt: null,
          applicableHotels: []
        };
      }
      
      // Проверяем, применим ли промокод к отелю
      const isApplicable = !hotelId || promo.applicableHotels.includes(hotelId);
      
      return {
        ...promo,
        isValid: isApplicable
      };
    },
    
    activePromoCodes: () => {
      return Object.entries(promoCodesDB).map(([code, promo]) => ({
        ...promo,
        code
      }));
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4003 },
}).then(() => {
  console.log('✅ Promocode subgraph ready at http://localhost:4003/');
});