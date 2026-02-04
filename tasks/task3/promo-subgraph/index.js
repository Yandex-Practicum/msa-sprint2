import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import fetch from 'node-fetch'; 

const typeDefs = gql`
  
extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@override", "@key", "@requires", "@external"])
  
extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    discountPercent: Float! @override(from: "booking")  
    discountInfo: DiscountInfo @requires(fields: "promoCode")
} 
  
  #тут просто пример нового типа, можно сделать свой
  type DiscountInfo {
    isValid: Boolean!
    originalDiscount: Float!    # Исходное значение из booking
    finalDiscount: Float!       # Актуальное значение после проверки
    description: String
    expiresAt: String
    applicableHotels: [ID!]!
  }
  
  #набор запросов для примера
  type Query {
    validatePromoCode(code: String!, userId: ID): DiscountInfo!
    
     }  
`;



const resolvers = {
  Query: {
    validatePromoCode: async (_, { code, userId }) => {
      try {
                
        const response = await fetch(`http://monolith:8080/api/promos/validate?code=${code}&userId=${userId}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',            
          },           
         
        });

        if (!response.ok) {
          throw new Error(`Promo service error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Преобразуем ответ сервиса в формат DiscountInfo
        return {
          isValid: data.isValid,
          originalDiscount: data.originalDiscount,
          finalDiscount: data.finalDiscount,
          description: data.description,
          expiresAt: data.expiresAt,
          applicableHotels: data.applicableHotelIds || []
        };
        
      } catch (error) {
        console.error('Error validating promo code:', error);
        return {
          isValid: false,
          originalDiscount: 0,
          finalDiscount: 0,
          description: `Validation failed: ${error.message}`,
          applicableHotels: []
        };
      }
    },

  },
  
  Booking: {
    // Резолвер для Federation
    __resolveReference: (reference) => {
      // Возвращаем только поля, которые есть в reference
      console.log(reference)
      return reference;
    }
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4003 },
  context: async ({ req }) => ({ req }),
}).then(() => {
  console.log('✅ Booking subgraph ready at http://localhost:4003/');
});


