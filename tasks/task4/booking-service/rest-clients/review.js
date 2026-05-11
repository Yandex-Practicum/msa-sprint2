const axios = require('axios');

const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://monolith:8080';

class ReviewClient {
    async isTrustedHotel(hotelId) {
        try {
            const response = await axios.get(`${REVIEW_SERVICE_URL}/api/reviews/hotel/${hotelId}/trusted`);
            return response.data === true;
        } catch (error) {
            console.warn(`Failed to check trusted hotel: ${error.message}, defaulting to false`);
            return false;
        }
    }

    async getHotelReviews(hotelId) {
        try {
            const response = await axios.get(`${REVIEW_SERVICE_URL}/api/reviews/hotel/${hotelId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get hotel reviews: ${error.message}`);
        }
    }
}

module.exports = new ReviewClient();