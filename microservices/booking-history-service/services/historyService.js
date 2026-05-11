const { pool } = require('../db');

class HistoryService {
    async saveBookingEvent(event) {
        const query = `
      INSERT INTO booking_history 
        (booking_id, user_id, hotel_id, promo_code, discount_percent, price, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

        await pool.query(query, [
            event.id,
            event.user_id,
            event.hotel_id,
            event.promo_code || null,
            event.discount_percent,
            event.price,
            event.created_at,
        ]);

        console.log(`Booking history saved: ${event.id}`);
    }

    async getAllHistory() {
        const result = await pool.query(
            'SELECT * FROM booking_history ORDER BY received_at DESC'
        );
        return result.rows;
    }

    async getHistoryByUser(userId) {
        const result = await pool.query(
            'SELECT * FROM booking_history WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return result.rows;
    }
}

module.exports = new HistoryService();