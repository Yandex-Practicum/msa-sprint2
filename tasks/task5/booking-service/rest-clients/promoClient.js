const axios = require('axios');

const PROMO_SERVICE_URL = process.env.PROMO_SERVICE_URL || 'http://monolith:8080';

class PromoClient {
    async validatePromo(promoCode, userId) {
        if (!promoCode) return null;

        try {
            const response = await axios.post(
                `${PROMO_SERVICE_URL}/api/promos/validate?code=${promoCode}&userId=${userId}`
            );
            return {
                code: response.data.code,
                discountPercent: response.data.discountPercent,
                active: response.data.active,
                vipOnly: response.data.vipOnly
            };
        } catch (error) {
            if (error.response?.status === 400) {
                return null;
            }
            throw new Error(`Failed to validate promo: ${error.message}`);
        }
    }
}

module.exports = new PromoClient();