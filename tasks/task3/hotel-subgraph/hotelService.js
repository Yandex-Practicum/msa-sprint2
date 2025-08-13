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
    /**try {

      return await restClient.get(`${this.serviceUrl}/api/hotels/${id}`);
    } catch (error) {
      console.error(' Hotel Service   Error fetching hotel:', error);
      throw error;
    }**/
    return {
      id: 'b1',
      userId,
      hotelId: 'h1',
      discountPercent: 20,
      promoCode: 'SUMMER',
      };
  }
  async getHotelsByIds(ids)
  {
    const hotels = [];
    ids.forEach(async id => {
      var hotel = await this.getHotelById(id);
      hotels.push(hotel);
    });
  }
}

export default HotelService;