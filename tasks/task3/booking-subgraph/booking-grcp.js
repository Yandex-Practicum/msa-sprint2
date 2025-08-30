import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_PATH = './proto/booking.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true,
});

const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;

const bookingService = new bookingProto.BookingService(process.env.BOOKING_SERVICE_URL, grpc.credentials.createInsecure())

export class BookingClient {
	createBooking(userId, hotelId, promoCode = '') {
		return new Promise((resolve, reject) => {
			const request = {
				user_id: userId,
				hotel_id: hotelId,
				promo_code: promoCode
			};

			bookingService.CreateBooking(request, (error, response) => {
				if (error) {
					reject(this.handleError(error));
				} else {
					resolve(response);
				}
			});
		});
	}

	listBookings(userId) {
		return new Promise((resolve, reject) => {
			const request = {
				user_id: userId
			};

			bookingService.ListBookings(request, (error, response) => {
				if (error) {
					reject(this.handleError(error));
				} else {
					resolve(response);
				}
			});
		});
	}

	handleError(error) {
		if (error.code === grpc.status.NOT_FOUND) {
			return new Error('Booking service not found or unavailable');
		} else if (error.code === grpc.status.INVALID_ARGUMENT) {
			return new Error('Invalid request parameters');
		} else if (error.code === grpc.status.INTERNAL) {
			return new Error('Internal server error');
		} else {
			return new Error(`gRPC error: ${error.message}`);
		}
	}
}


