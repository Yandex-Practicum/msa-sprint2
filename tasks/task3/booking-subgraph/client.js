import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

export class BookingClient {
  constructor(address) {
    const packageDefinition = protoLoader.loadSync('booking.proto', {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });

    const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;
    this.client = new bookingProto.BookingService(
      address,
      grpc.credentials.createInsecure()
    );
  }

  async listBookings(userId) {
    return new Promise((resolve, reject) => {
      this.client.ListBookings(
        { user_id: userId },
        (err, response) => {
          if (err) {
            console.error('gRPC error:', err);
            reject(new Error('Failed to fetch bookings'));
          } else {
            resolve(response.bookings.map(booking => ({
              id: booking.id,
              userId: booking.user_id,
              hotelId: booking.hotel_id,
              promoCode: booking.promo_code || null,
              discountPercent: booking.discount_percent || 0
            })));
          }
        }
      );
    });
  }

  async getBookingById(userId, bookingId) {
    const bookings = await this.listBookings(userId);
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    return booking;
  }
}