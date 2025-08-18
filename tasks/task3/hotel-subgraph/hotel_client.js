import fetch from 'node-fetch';

export class HotelClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async getHotelById(id) {
        try {
            const response = await fetch(`http://${this.baseUrl}/api/hotels/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const hotel = await response.json();

            // Преобразуем данные из REST API в GraphQL тип
            return {
                id: hotel.id,
                name: hotel.id,
                city: hotel.city,
                stars: Math.floor(hotel.rating)
            };
        } catch (error) {
            console.error('Failed to fetch hotel:', error);
            throw new Error('Failed to fetch hotel');
        }
    }

    async getHotelsByIds(ids) {
        return Promise.all(ids.map(id => this.getHotelById(id)));
    }
}