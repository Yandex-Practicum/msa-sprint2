const { pool } = require('../db');
const userClient = require('../rest-clients/userClient');
const hotelClient = require('../rest-clients/hotelClient');
const promoClient = require('../rest-clients/promoClient');
const { sendBookingCreatedEvent } = require('../kafka/producer');

class BookingService {
    async createBooking(userId, hotelId, promoCode) {
        console.log(`Creating booking: userId=${userId}, hotelId=${hotelId}, promoCode=${promoCode}`);

        const isActive = await userClient.isUserActive(userId);
        if (!isActive) {
            throw new Error('User is inactive');
        }

        const isBlacklisted = await userClient.isUserBlacklisted(userId);
        if (isBlacklisted) {
            throw new Error('User is blacklisted');
        }

        const isOperational = await hotelClient.isHotelOperational(hotelId);
        if (!isOperational) {
            throw new Error('Hotel is not operational');
        }

        const isFullyBooked = await hotelClient.isHotelFullyBooked(hotelId);
        if (isFullyBooked) {
            throw new Error('Hotel is fully booked');
        }

        const basePrice = await userClient.getBasePrice(userId);

        let discount = 0;
        if (promoCode) {
            const validatedPromo = await promoClient.validatePromo(promoCode, userId);
            if (validatedPromo) {
                discount = validatedPromo.discountPercent;
            }
        }

        const finalPrice = basePrice - discount;
        console.log(`Final price: base=${basePrice}, discount=${discount}, final=${finalPrice}`);

        const result = await pool.query(
            `INSERT INTO bookings (user_id, hotel_id, promo_code, discount_percent, price, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, user_id, hotel_id, promo_code, discount_percent, price, created_at`,
            [userId, hotelId, promoCode || null, discount, finalPrice]
        );

        const booking = result.rows[0];

        const data = {
            id: booking.id.toString(),
            user_id: booking.user_id,
            hotel_id: booking.hotel_id,
            promo_code: booking.promo_code || '',
            discount_percent: parseFloat(booking.discount_percent),
            price: parseFloat(booking.price),
            created_at: booking.created_at ? new Date(booking.created_at).toISOString() : new Date().toISOString(),
        };

        try {
            await sendBookingCreatedEvent(data);
        } catch (error) {
            console.error('Failed to send Kafka event:', error.message);
        }

        return data;
    }

    async listBookings(userId) {
        let query = 'SELECT * FROM bookings';
        const params = [];

        if (userId) {
            query += ' WHERE user_id = $1 ORDER BY created_at DESC';
            params.push(userId);
        } else {
            query += ' ORDER BY created_at DESC';
        }

        const result = await pool.query(query, params);

        return result.rows.map(row => ({
            id: row.id.toString(),
            user_id: row.user_id,
            hotel_id: row.hotel_id,
            promo_code: row.promo_code || '',
            discount_percent: parseFloat(row.discount_percent),
            price: parseFloat(row.price),
            created_at: row.created_at.toISOString(),
        }));
    }
}

module.exports = new BookingService();