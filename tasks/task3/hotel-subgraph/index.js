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

const fetchHotelsFromService = (userId) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://hotelio-monolith:8080/api/hotels`);
    url.searchParams.append('userId', userId);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 8080,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 5000, // 5 секунд таймаут
    };
    
    console.log(`📡 Calling Hotel service: ${options.hostname}:${options.port}${options.path}`);
    
    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      
      // Проверяем статус ответа
      if (res.statusCode < 200 || res.statusCode >= 300) {
        console.error(`❌ Hotel service responded with status: ${res.statusCode} ${res.statusMessage}`);
        reject(new Error(`Hotel service error: ${res.statusCode} ${res.statusMessage}`));
        return;
      }
      
      // Собираем данные
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // Когда все данные получены
      res.on('end', () => {
        try {
          const hotels = JSON.parse(data);
          console.log(`✅ Received ${hotels?.length || 0} hotels from service`);
          resolve(Array.isArray(hotels) ? hotels : []);
        } catch (error) {
          console.error('❌ Failed to parse JSON response:', error.message);
          reject(new Error('Invalid JSON response from Hotel service'));
        }
      });
    });
    
    // Обработка ошибок
    req.on('error', (error) => {
      console.error('❌ HTTP request error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('Hotel service is unavailable'));
      } else if (error.code === 'ETIMEDOUT') {
        reject(new Error('Hotel service timeout'));
      } else {
        reject(new Error(`HTTP request failed: ${error.message}`));
      }
    });
    
    // Таймаут
    req.on('timeout', () => {
      req.destroy();
      console.error('❌ Request timeout after 5 seconds');
      reject(new Error('Hotel service timeout'));
    });
    
    // Завершаем запрос
    req.end();
  });
};

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      // TODO: Реальный вызов к hotel-сервису или заглушка
    },
  },
  Query: {
    hotelsByIds: async (_, { ids }) => {
      // TODO: Заглушка или REST-запрос
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
