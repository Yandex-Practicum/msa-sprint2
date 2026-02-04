import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import fetch from 'node-fetch'; 

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: ID!
    hotelId: ID!
    promoCode: String
    discountPercent: Float!
  }

  type Query {
    bookingsByUser(userId: ID!): [Booking]
    
  }  
`;



const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
		try {
        
      const isAuthResponse = await fetch(`http://monolith:8080/api/users/${userId}/authorized`, {
          method: 'GET',
          headers: {
             'Content-Type': 'application/json'
          }
        });
        
      const data = await isAuthResponse.json();
      const isAuthorized = isAuthResponse.ok && ( data === true || data.authorized === true);
      
      if (!isAuthorized) {
          throw new Error(`User is not authorized`);
        }
      
      const response = await fetch(`http://monolith:8080/api/bookings?userId=${userId}`, {
          method: 'GET',
          headers: {
             'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Booking service responded with status: ${response.status}`);
        }
        
        const bookings = await response.json();
        
        // 3. Возвращаем данные в формате GraphQL
        return bookings.map(booking => ({
          id: booking.id,
          userId: booking.userId,
          hotelId: booking.hotelId,
          promoCode: booking.promoCode || null,
          discountPercent: booking.discountPercent || null
        }));
        
      } catch (error) {
        console.error('Error fetching bookings:', error);
        throw new Error(`Failed to fetch bookings: ${error.message}`);
      }
    },
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => ({ req }),
}).then(() => {
  console.log('✅ Booking subgraph ready at http://localhost:4001/');
});


