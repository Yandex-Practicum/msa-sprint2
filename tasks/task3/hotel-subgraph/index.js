import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const typeDefs = gql`
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
const url = "hotelio-monolith:8080/api/hotels/"



async function getHotelInfo(id) {
  try {
    const response = await fetch(url + id, {
      method: 'Get',
    });
    
    // Проверяем статус ответа
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! Status: ${response.status}. Body: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    
    // !!! ИСПРАВЛЕНИЕ: Используйте .map() с маленькой буквы !!!
    return responseData.map((i) => { 
      return ({
        id: String(i.Id), // Убедитесь, что ID это строка
        name: i.name,
        city: i.city,
        stars: i.rating,
      });
    });

  } catch (error) {
    console.error(`FETCH/PARSE ERROR for URL ${url + id}:`, error.message);
    throw error; // Пробрасываем ошибку дальше в GraphQL
  }
}

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      return getHotelInfo(id)
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }) => {
      return ids.map((i)=>{
        return getHotelInfo(i);
      });
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
}).then(() => {
  console.log('✅ Hotel subgraph ready at http://localhost:4002/');
});
