const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://monolith:8080';

class UserClient {
    async getUserStatus(userId) {
        try {
            const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}/status`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get user status: ${error.message}`);
        }
    }

    async isUserActive(userId) {
        try {
            const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}/active`);
            return response.data === true;
        } catch (error) {
            throw new Error(`Failed to check user active: ${error.message}`);
        }
    }

    async isUserBlacklisted(userId) {
        try {
            const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}/blacklisted`);
            return response.data === true;
        } catch (error) {
            throw new Error(`Failed to check user blacklisted: ${error.message}`);
        }
    }

    async isUserVip(userId) {
        try {
            const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}/vip`);
            return response.data === true;
        } catch (error) {
            return false;
        }
    }

    async getBasePrice(userId) {
        const isVip = await this.isUserVip(userId);
        return isVip ? 80.0 : 100.0;
    }
}

module.exports = new UserClient();