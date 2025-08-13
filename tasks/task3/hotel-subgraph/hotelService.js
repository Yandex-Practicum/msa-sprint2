import { restClient } from './restClient.js';

/**
 * Hotel Service
 */
class HotelService {
  
  constructor(constructorArg) {   
    this.serviceUrl = constructorArg;
  }
  async getHotelById(id)
  {
    try {
	return await restClient.get(`${this.serviceUrl}/api/hotels/${id}`);
    } catch (error) {
      console.error(' Hotel Service   Error fetching hotel:', error);      
    }
    /**return {
      id: 'b1',
      city: 'NN',
      name: '4seasons',
      stars: 3
    };**/
  }
  async getHotelsByIds(ids)
  {
    const promises = ids.map(id => this.getHotelById(id));
    const hotels = await Promise.all(promises);
    return hotels
  }
}

export default HotelService;
