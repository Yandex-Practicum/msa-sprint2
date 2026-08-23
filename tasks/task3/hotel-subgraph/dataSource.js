// Имитация доступа к БД или REST API монолита
// ID отелей синхронизированы с fixtures из init-fixtures.sql
const mockHotels = [
  {
    id: 'test-hotel-1',
    name: 'Seoul Downtown Hotel',
    address: '123 Gangnam-daero, Seoul',
    rating: 4.7,
    amenities: ['wifi', 'spa', 'skybar'],
    images: []
  },
  {
    id: 'test-hotel-2',
    name: 'Busan Beach Resort',
    address: '456 Haeundae Beach, Busan',
    rating: 4.5,
    amenities: ['wifi', 'pool', 'ocean view'],
    images: []
  },
  {
    id: 'test-hotel-3',
    name: 'Daegu Business Hotel',
    address: '789 Dongseong-ro, Daegu',
    rating: 3.8,
    amenities: ['parking', 'wifi'],
    images: []
  }
];

export class HotelDataSource {
  // ОДИН запрос за множеством отелей (для батчинга - решение проблемы N+1)
  async getHotelsByIds(ids) {
    console.log(`📡 [DataLoader] Fetching ${ids.length} hotels in ONE query: [${ids.join(', ')}]`);
    return mockHotels.filter(h => ids.includes(h.id));
  }

  async getHotelById(id) {
    console.log(`📡 [DataLoader] Fetching single hotel: ${id}`);
    return mockHotels.find(h => h.id === id) || null;
  }
}