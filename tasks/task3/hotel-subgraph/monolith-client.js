import axios from 'axios';

export class MonolithClient {
	baseUrl = process.env.MONOLITH_BASE_URL;

	async getHotelById(id) {
		try {
			const response = await axios.get(`${this.baseUrl}/api/hotels/${id}`);
			return response.data;
		} catch (error) {
			return null;
		}
	}
}