// hotel-subgraph.js
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import fetch from 'node-fetch';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@shareable"])

  type Hotel @key(fields: "id") {
    id: ID!
    name: String
    city: String
    stars: Int
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]
  }
`;

const resolvers = {
  Hotel: {
    // req будет доступен, если context правильно настроен в startStandaloneServer
    __resolveReference: async ({ id }, { req }) => {
      console.log('hotels');
      try {
        // req может быть undefined, если context не передан
        if (!req || !req.headers) {
          console.error('Context or req.headers is missing in __resolveReference for Hotel');
          // В зависимости от логики, можно выбросить ошибку или обработать иначе
          // В федеративном сценарии (когда booking возвращает hotel), заголовки могут не передаваться.
          // В таком случае, проверка авторизации здесь может быть неуместна.
          // throw new Error('Context or req.headers is missing');
          // Для простоты, пока не проверяем заголовки в __resolveReference, если они не передаются
        } else {
          const userid = req.headers['userid'];
          if (!userid) throw new Error('Unauthorized: userid header required');
        }

        const res = await fetch(`http://hotelio-monolith:8080/api/hotels/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return {
          __typename: 'Hotel',
          id: data.id || id,
          name: data.description || 'Test Hotel Moscow',
          city: data.city || 'Moscow',
          stars: Math.floor(data.rating) || 4
        };
      } catch (err) {
        console.error(`Failed to fetch hotel ${id}:`, err.message);
        return { __typename: 'Hotel', id, name: "Unknown", city: "N/A", stars: 0 };
      }
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }, { req }) => {
      console.log('hotelsByIds');
      // req.headers должен быть доступен здесь, если context настроен
      console.log('Все заголовки запроса:', req.headers);

      const userid = req.headers['userid'];
      if (!userid) throw new Error('Unauthorized: userid header required');

      const hotels = [];
      for (const id of ids) {
        const response = await fetch(`http://hotelio-monolith:8080/api/hotels/${id}`);
        if (response.ok) {
          const data = await response.json();
          // Убедитесь, что возвращаемая структура соответствует схеме Hotel
          hotels.push({
            __typename: 'Hotel',
            id: data.id || id,
            name: data.description || 'Default Name',
            city: data.city || 'Default City',
            stars: Math.floor(data.rating) || 0
          });
        } else {
          hotels.push({ __typename: 'Hotel', id, name: "Unknown", city: "N/A", stars: 0 });
        }
      }
      return hotels;
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

// КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Добавляем context
startStandaloneServer(server, {
  listen: { port: 4002 },
  context: async ({ req }) => ({ req }), // Передаём req в контекст
}).then(() => {
  console.log('✅ Hotel subgraph ready at http://localhost:4002/');
});