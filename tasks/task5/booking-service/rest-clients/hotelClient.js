const axios = require('axios');

const HOTEL_SERVICE_URL = process.env.HOTEL_SERVICE_URL || 'http://monolith:8080';

class HotelClient {
    async isHotelOperational(hotelId) {
        try {
            const response = await axios.get(`${HOTEL_SERVICE_URL}/api/hotels/${hotelId}/operational`);
            return response.data === true;
        } catch (error) {
            throw new Error(`Failed to check hotel operational: ${error.message}`);
        }
    }

    async isHotelFullyBooked(hotelId) {
        try {
            const response = await axios.get(`${HOTEL_SERVICE_URL}/api/hotels/${hotelId}/fully-booked`);
            return response.data === true;
        } catch (error) {
            throw new Error(`Failed to check hotel fully booked: ${error.message}`);
        }
    }

    async getHotelRating(hotelId) {
        try {
            const response = await axios.get(`${HOTEL_SERVICE_URL}/api/hotels/${hotelId}`);
            return response.data.rating;
        } catch (error) {
            throw new Error(`Failed to get hotel rating: ${error.message}`);
        }
    }
}

module.exports = new HotelClient();