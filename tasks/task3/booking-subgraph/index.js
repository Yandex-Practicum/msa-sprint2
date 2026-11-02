import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    hotel: Hotel
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
  }
  
  type Hotel @key(fields: "id") {
    id: ID!
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }

`;

const resolvers = {
    Query: {
        bookingsByUser: async (_, { userId }, { req }) => {
            console.log(`Received request for bookings by userId: ${userId}`);
            const currentUserId = req.user?.id || req.headers['x-user-id'];

            if (!currentUserId) {
                throw new Error("Неавторизован: отсутствует токен или ID пользователя");
            }

            if (userId !== currentUserId) {
                console.log(`Access denied for userId: ${userId}`);
                throw new Error("Доступ запрещен: вы можете смотреть только свои бронирования");
            }

            try {
                const response = await fetch(`http://booking-service:8085/api/bookings/${userId}`);

                if (!response.ok) {
                    throw new Error(`Ошибка Java-сервиса: HTTP ${response.status}`);
                }

                const bookings = await response.json();

                return bookings;
            } catch (error) {
                console.error("Ошибка при получении бронирований:", error.message);
                throw new Error("Не удалось получить бронирования из базы");
            }
        },
    },
    Booking: {
        __resolveReference: async (booking) => {
            return booking;
        },
        hotel: (booking) => {
            return { __typename: "Hotel", id: booking.hotelId };
        }
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
