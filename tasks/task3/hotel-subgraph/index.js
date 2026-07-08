import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import DataLoader from 'dataloader';

const typeDefs = gql`
  schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])
  {
    query: Query
  }

  type Hotel @key(fields: "id") {
    id: ID!
    name: String!
    city: String!
    stars: Int
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel!]!
  }
`;

// Встроенные данные
const hotelsData = [
  { id: 'test-hotel-1', name: 'Seoul Hotel', city: 'Seoul', stars: 5 },
  { id: 'test-hotel-2', name: 'Busan Inn', city: 'Busan', stars: 4 },
  { id: 'test-hotel-3', name: 'Incheon Plaza', city: 'Incheon', stars: 3 },
];

// Batch loader для оптимизации N+1 запросов
const createHotelBatchLoader = () => {
  return new DataLoader(async (ids) => {
    console.log(`🏨 DataLoader: batching ${ids.length} hotel(s) - IDs: [${ids.join(', ')}]`);

    // Батчируем все ID в 1 запрос вместо N отдельных
    return ids.map(id => {
      const hotel = hotelsData.find(h => h.id === id);
      if (hotel) {
        console.log(`  ✅ Found hotel: ${id} - ${hotel.name}`);
      } else {
        console.log(`  ❌ Hotel not found: ${id}`);
      }
      return hotel || null;
    });
  });
};

const resolvers = {
  Hotel: {
    __resolveReference: async (hotel, _, context) => {
      console.log(`🔍 __resolveReference: hotel.id = ${hotel.id}`);
      // Используем DataLoader если доступен, иначе прямой поиск
      if (context && context.hotelLoader) {
        return context.hotelLoader.load(hotel.id);
      }
      // Fallback: прямой поиск без loader
      return hotelsData.find(h => h.id === hotel.id) || null;
    },
  },

  Query: {
    hotelsByIds: async (_, { ids }, context) => {
      console.log(`🏨 Query hotelsByIds: requesting ${ids.length} hotel(s)`);
      // Используем DataLoader если доступен
      if (context && context.hotelLoader) {
        return Promise.all(ids.map(id => context.hotelLoader.load(id)));
      }
      // Fallback: прямой поиск
      return ids.map(id => hotelsData.find(h => h.id === id) || null);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
  context: async () => ({
    // Создаём новый DataLoader для каждого запроса
    // Это важно для кеширования в рамках одного запроса
    hotelLoader: createHotelBatchLoader(),
  }),
}).then(() => {
  console.log('✅ Hotel subgraph ready at http://localhost:4002/');
  console.log('🏨 Hotels available:', hotelsData.map(h => `${h.id} (${h.name})`).join(', '));
  console.log('📊 DataLoader будет батчировать запросы отелей!');
});
