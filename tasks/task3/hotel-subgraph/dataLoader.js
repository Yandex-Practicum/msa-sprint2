import DataLoader from 'dataloader';

export function createHotelLoader(dataSource) {
  return new DataLoader(async (ids) => {
    // 1. Делаем ОДИН запрос за всеми нужными ID
    const hotels = await dataSource.getHotelsByIds(ids);
    
    // 2. Возвращаем результат в том же порядке, что и входные IDs
    // DataLoader ожидает массив той же длины, что и ids
    const hotelMap = new Map(hotels.map(h => [h.id, h]));
    return ids.map(id => hotelMap.get(id) || null);
  }, {
    cache: true,           // Кешируем результаты на время запроса
    batch: true,           // Включаем батчинг
    maxBatchSize: 100,     // Максимум ID в одном запросе
  });
}