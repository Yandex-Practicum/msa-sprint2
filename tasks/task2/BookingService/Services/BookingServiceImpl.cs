using BookingService.Data;
using BookingService.Models;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BookingService
{
    public class BookingServiceImpl : BookingService.BookingServiceBase
    {
        private readonly ILogger<BookingServiceImpl> _logger;
        private readonly BookingDbContext _dbContext;

        public BookingServiceImpl(
            ILogger<BookingServiceImpl> logger,
            BookingDbContext dbContext)
        {
            _logger = logger;
            _dbContext = dbContext;
        }

        public override async Task<BookingResponse> CreateBooking(
            BookingRequest request,
            ServerCallContext context)
        {
            var discount = CalculateDiscount(request.PromoCode);
            var basePrice = await GetBasePrice(request.HotelId);
            var finalPrice = basePrice * (1 - discount / 100);

            var booking = new Booking
            {
                UserId = request.UserId,
                HotelId = request.HotelId,
                PromoCode = request.PromoCode,
                DiscountPercent = discount,
                Price = finalPrice
            };

            _dbContext.Booking.Add(booking);
            await _dbContext.SaveChangesAsync();

            return MapToResponse(booking);
        }

        public override async Task<BookingListResponse> ListBookings(
            BookingListRequest request,
            ServerCallContext context)
        {
            var bookings = await _dbContext.Booking
                .Where(b => b.UserId == request.UserId)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            var response = new BookingListResponse();
            response.Bookings.AddRange(bookings.Select(MapToResponse));
            return response;
        }

        private static BookingResponse MapToResponse(Booking booking)
        {
            return new BookingResponse
            {
                Id = booking.Id.ToString(),
                UserId = booking.UserId,
                HotelId = booking.HotelId,
                PromoCode = booking.PromoCode,
                DiscountPercent = booking.DiscountPercent,
                Price = booking.Price,
                CreatedAt = booking.CreatedAt.ToString("o")
            };
        }

        private static double CalculateDiscount(string promoCode)
        {
            // Запрос в монолит TO DO
            return promoCode?.ToLower() switch
            {
                "summer10" => 10,
                "winter20" => 20,
                "special30" => 30,
                _ => 0
            };
        }

        private async Task<double> GetBasePrice(string hotelId)
        {
            // Запрос в монолит TO DO
            return await Task.FromResult(100.0);
        }
    }
}