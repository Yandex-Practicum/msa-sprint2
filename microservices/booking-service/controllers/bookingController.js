const grpc = require('@grpc/grpc-js');
const bookingService = require('../services/bookingService');

module.exports = {
    createBooking: async (call, callback) => {
        try {
            const { user_id, hotel_id, promo_code } = call.request;
            const result = await bookingService.createBooking(user_id, hotel_id, promo_code);
            callback(null, result);
        } catch (error) {
            console.error('CreateBooking error:', error.message);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message,
            });
        }
    },

    listBookings: async (call, callback) => {
        try {
            const { user_id } = call.request;
            const result = await bookingService.listBookings(user_id);
            callback(null, { bookings: result });
        } catch (error) {
            console.error('ListBookings error:', error.message);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message,
            });
        }
    },
};