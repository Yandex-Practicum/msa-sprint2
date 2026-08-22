// Имитация доступа к БД или REST API
// Замени на реальный вызов к твоей БД/монолиту

const mockHotels = [
  { id: '1', name: 'Hotel California', address: '123 Sunset Blvd', rating: 4.5, amenities: ['wifi', 'pool'], images: [] },
  { id: '2', name: 'Grand Budapest', address: '456 Republic St', rating: 4.8, amenities: ['wifi', 'spa'], images: [] },
  { id: '3', name: 'Overlook Hotel', address: '789 Mountain Rd', rating: 3.2, amenities: ['parking'], images: [] },
];

export class HotelDataSource {
  // ОДИН запрос за множеством отелей (для батчинга)
  async getHotelsByIds(ids) {
    console.log(`📡 Fetching ${ids.length} hotels in ONE query: [${ids.join(', ')}]`);
    
    // Замени на реальный запрос:
    // SELECT * FROM hotels WHERE id IN (...)
    // или fetch(`${HOTEL_API_URL}/hotels?ids=${ids.join(',')}`)
    return mockHotels.filter(h => ids.includes(h.id));
  }

  async getHotelById(id) {
    console.log(`📡 Fetching single hotel: ${id}`);
    return mockHotels.find(h => h.id === id) || null;
  }
}