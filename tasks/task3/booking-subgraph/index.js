import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLError } from 'graphql';
import gql from 'graphql-tag';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://monolith:8080';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key"])

  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    hotel: Hotel        # <-- вот это поле должно появиться
    promoCode: String
    discountPercent: Float
  }

  # Объявляем тип Hotel в booking-subgraph, чтобы Federation знала о его существовании
  type Hotel @key(fields: "id") {
    id: ID!
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

const resolvers = {
   Query: {
    bookingsByUser: async (_, { userId }, { user }) => {
      console.log("[1. ACL] Проверка: user из заголовка =", user?.id, ", запрошенный userId =", userId);
      
      if (!user) {
        throw new GraphQLError('Не передан заголовок userid', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      if (user.id !== userId) {
        throw new GraphQLError('Можно просматривать только свои бронирования', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const url = `${MONOLITH_URL}/api/bookings?userId=${encodeURIComponent(userId)}`;
      console.log("[2. Fetch] Делаем запрос к монолиту:", url);
      
      const res = await fetch(url);
      console.log("[3. Fetch] Статус ответа от монолита:", res.status);
      
      if (!res.ok) {
        throw new GraphQLError(`Монолит вернул статус ${res.status}`, {
          extensions: { code: 'UPSTREAM_ERROR' },
        });
      }

      const bookings = await res.json();
      console.log("[4. Raw Data] Сырые данные от монолита:", JSON.stringify(bookings));
      
      const mapped = bookings.map((b) => ({
        id: String(b.id), // <-- Вот здесь мы берем b.id
        userId: b.userId,
        hotelId: b.hotelId,
        promoCode: b.promoCode ?? null,
        discountPercent: b.discountPercent ?? 0,
      }));
      
      console.log("[5. Mapped] Данные, которые уйдут в GraphQL:", JSON.stringify(mapped));
      return mapped;
    },
  },
  Booking: {
    // Ключевой резолвер: говорим Федерации, как связать бронь с отелем
    hotel: (booking) => ({ __typename: 'Hotel', id: booking.hotelId }),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => {
    // 1. Логируем ВСЕ заголовки, чтобы увидеть, что именно прислал Gateway или браузер
    console.log("[SUBGRAPH] Все заголовки запроса:", JSON.stringify(req.headers));

    // 2. Ищем заголовок 'userid' в любом регистре (на случай, если Gateway или браузер изменили регистр)
    const headerKeys = Object.keys(req.headers);
    const useridKey = headerKeys.find(k => k.toLowerCase() === 'userid');
    const userid = useridKey ? req.headers[useridKey] : null;

    console.log("[SUBGRAPH] Извлеченный userid:", userid);

    return { user: userid ? { id: userid } : null };
  },
}).then(() => {
  console.log('Booking subgraph ready at http://localhost:4001/');
});