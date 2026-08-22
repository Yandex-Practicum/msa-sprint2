import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { HotelDataSource } from './dataSource.js';
import { createHotelLoader } from './dataLoader.js';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4002 },
  context: async () => {
    const dataSource = new HotelDataSource();
    return {
      dataSources: {
        hotelDataSource: dataSource,
        hotelLoader: createHotelLoader(dataSource),
      },
    };
  },
});

console.log(`🚀 Hotel Subgraph ready at ${url}`);