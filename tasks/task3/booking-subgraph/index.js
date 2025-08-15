import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
    hotel: Hotel
  }
  # Расширяем типы из других сервисов
  extend type Hotel @key(fields: "id") {
  id: ID! @external
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }

`;
import BookingService from './bookingService.js';
/**
   * 
   * @param {string} serviceUrl - URL к Hotel-сервису
   */

const serviceUrl = process.env.SERVICE_URL;
console.log('✅ Booking service' + process.env.SERVICE_URL)
if (!serviceUrl) {
  throw new Error('serviceUrl is not defined in environment variables');
}
const bookingService = new BookingService(serviceUrl);

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      //console.log(req.headers['userid']);
      //Для реализации ACL проверяйте req.headers['userid'] в резолверах.?
      //Такого в заголовке не передается!
      var req = { user_id: userId };
      var bookings = await bookingService.listBookings(req)
      //console.log(bookings);
      return bookings
    }
  },
  Booking:{
    __resolveReference: async ({ id }) => {
      // TODO: Реальный вызов к hotel-сервису или заглушка
      //В реальном сервисе не реализована функция возврата Booking по id
      return {id: id};
   },
   hotel(booking) {
      return { __typename: 'Hotel', id: booking.hotelId };
    },
  },
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
