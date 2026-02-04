import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import fetch from 'node-fetch'; 
import DataLoader from 'dataloader';

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

const createHotelLoader = () => {
  return new DataLoader(async (ids) => {
    
    console.log(`[HotelLoader] Batch loading hotels: ${ids.join(', ')}`);
    
    // Здесь можно сделать batch запрос если API поддерживает
    // Если нет - делаем параллельные запросы
    const hotels = await Promise.all(
      ids.map(async (id) => {
        try {
          const response = await fetch(`http://monolith:8080/api/hotels/${id}`);
          if (!response.ok) {
            return { id, error: `Not found` };
          }
          console.log(response);
          
          return await response.json();
        } catch (error) {
          console.error(`Failed to fetch hotel ${id}:`, error);
          return { id, error: true };
        }
      })
    );
    
    // DataLoader требует сохранять порядок
    return hotels;
  }, {
    batch: true,
    cache: true, // Кэширует результаты
  });
};



const resolvers = {
  Hotel: {
    __resolveReference: async ({ id },{ hotelLoader }) => {
      
      const hotel = await hotelLoader.load(id);
      if (hotel instanceof Error) {
        throw hotel;
      }
      return hotel;

    },
  },
  Query: {
    hotelsByIds: async (_, { ids }, { hotelLoader }) => {
       
      const results = await hotelLoader.loadMany(ids);
      
      // Обработка ошибок
      return results.map(result => {
        if (result instanceof Error) {
          // Можно вернуть null или выбросить ошибку
          console.error(result.message);
          return null;
        }
        return result;
      });
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
   context: async ({ req }) => ({
    req,
    hotelLoader: createHotelLoader(),
  })
}).then(() => {
  console.log('✅ Hotel subgraph ready at http://localhost:4002/');
});
