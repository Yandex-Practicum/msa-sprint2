const { ApolloServer } = require('@apollo/server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { gql } = require('graphql-tag');
const { Pool } = require('pg');
const axios = require('axios');

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Float!
    hotel: Hotel
  }

  type Query {
    bookingsByUser(userId: String!): [Booking!]!
  }

  extend type Hotel @key(fields: "id") {
    id: ID! @external
  }
`;

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, context) => {
      // Получаем userid из заголовков или из контекста
      const requestUserId = context?.req?.headers?.['userid'] || context?.userid;
      
      if (!requestUserId) {
        throw new Error('Unauthorized: userid header required');
      }
      
      if (requestUserId !== userId) {
        throw new Error('Forbidden: can only access own bookings');
      }
      
      try {
        const pool = new Pool({
          host: process.env.BOOKING_DB_HOST || 'localhost',
          port: process.env.BOOKING_DB_PORT || 5433,
          database: process.env.BOOKING_DB_NAME || 'booking_service',
          user: process.env.BOOKING_DB_USER || 'booking_user',
          password: process.env.BOOKING_DB_PASSWORD || 'booking_pass',
        });

        const query = `
          SELECT id, user_id, hotel_id, promo_code, discount_percent 
          FROM bookings 
          WHERE user_id = $1
        `;
        
        const result = await pool.query(query, [userId]);
        await pool.end();
        
        return result.rows.map(row => ({
          id: row.id.toString(),
          userId: row.user_id,
          hotelId: row.hotel_id,
          promoCode: row.promo_code,
          discountPercent: row.discount_percent,
        }));
      } catch (error) {
        console.error('Database error:', error);
        throw new Error('Failed to fetch bookings');
      }
    },
  },
  
  Booking: {
    __resolveReference: async (reference) => {
      try {
        const pool = new Pool({
          host: process.env.BOOKING_DB_HOST || 'localhost',
          port: process.env.BOOKING_DB_PORT || 5433,
          database: process.env.BOOKING_DB_NAME || 'booking_service',
          user: process.env.BOOKING_DB_USER || 'booking_user',
          password: process.env.BOOKING_DB_PASSWORD || 'booking_pass',
        });

        const query = `
          SELECT id, user_id, hotel_id, promo_code, discount_percent 
          FROM bookings 
          WHERE id = $1
        `;
        
        const result = await pool.query(query, [reference.id]);
        await pool.end();
        
        if (result.rows.length === 0) {
          return null;
        }
        
        const row = result.rows[0];
        return {
          id: row.id.toString(),
          userId: row.user_id,
          hotelId: row.hotel_id,
          promoCode: row.promo_code,
          discountPercent: row.discount_percent,
        };
      } catch (error) {
        console.error('Database error:', error);
        return null;
      }
    },
    
    hotel: async (parent) => {
      return { __typename: 'Hotel', id: parent.hotelId };
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

const port = process.env.PORT || 4001;

startStandaloneServer(server, {
  listen: { port },
  context: async ({ req }) => ({ req }),
}).then(({ url }) => {
  console.log(`Booking subgraph ready at ${url}`);
});
