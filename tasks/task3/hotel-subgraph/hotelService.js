import { restClient } from './restClient.js';

/**
 * Hotel Service
 */
class HotelClient {
  
  constructor(constructorArg) {   
    this.serviceUrl = constructorArg;
  }
  async getHotelById(id)
  {
    try {
      return await restClient.get(`${this.serviceUrl}/hotels/${id}`);
    } catch (error) {
      console.error('Error fetching hotel:', error);
      throw error;
    }
  }
  async getHotelsByIds(ids)
  {
    const hotels = [];
    ids.forEach(async id => {
      var hotel = await getHotelById(id);
      hotels.push(hotel);
    });
  }
}

export default HotelClient;