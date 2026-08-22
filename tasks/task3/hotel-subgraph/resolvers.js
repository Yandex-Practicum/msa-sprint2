export const resolvers = {
  Hotel: {
    // Federation: резолвер для __resolveReference
    __resolveReference: async (reference, { dataSources }) => {
      // Используем DataLoader вместо прямого запроса!
      return dataSources.hotelLoader.load(reference.id);
    },
  },

  Query: {
    hotel: async (_, { id }, { dataSources }) => {
      // Для одиночного запроса тоже можно использовать loader
      return dataSources.hotelLoader.load(id);
    },

    // Публичный endpoint для батчинга
    hotelsByIds: async (_, { ids }, { dataSources }) => {
      // DataLoader автоматически сбатчится
      return dataSources.hotelLoader.loadMany(ids);
    },
  },
};