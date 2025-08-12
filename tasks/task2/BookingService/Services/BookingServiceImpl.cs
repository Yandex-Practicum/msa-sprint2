using BookingService.Data;
using BookingService.Models;
using BookingService.Services;
using Confluent.Kafka;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;

namespace BookingService
{
    public class BookingServiceImpl(
        ILogger<BookingServiceImpl> logger,
        BookingDbContext dbContext,
        BookingEventHandler bookingEventHandler,
        MonolitService monolit) : BookingService.BookingServiceBase
    {
        private readonly ILogger<BookingServiceImpl> _logger = logger;
        private readonly BookingDbContext _dbContext = dbContext;
        private readonly BookingEventHandler _bookingEventHandler = bookingEventHandler;
        private readonly MonolitService _monolit = monolit;


        public override async Task<BookingResponse> CreateBooking(
            BookingRequest request,
            ServerCallContext context)
        {
            //var discount = CalculateDiscount(request.PromoCode);
            //var basePrice = await GetBasePrice(request.HotelId);
            string? userId = request.UserId;
            string? hotelId = request.HotelId;
            string? promoCode = request.PromoCode;
            logger.LogInformation(@"Creating booking: userId={0}, hotelId={1}, promoCode={2}", userId, hotelId, promoCode);
            double basePrice = 0, discount = 0;
            //try
            //{
                ValidateUser(userId);
                ValidateHotel(hotelId);

                basePrice = ResolveBasePrice(userId);
                discount = ResolvePromoDiscount(promoCode, userId);
            //}
            //catch (Exception ex)
            //{
            //    logger.LogInformation(ex.ToString());
            //    logger.LogInformation("errors in requests");
            //}

            double finalPrice = basePrice - discount;
            logger.LogInformation(@"Final price calculated: base={0}, discount={1}, final={2}", basePrice, discount, finalPrice);

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
            var bookingEvent = new BookingEvent(booking.Id, booking.UserId, "Booking cretion", booking.CreatedAt);
            await _bookingEventHandler.HandleAsync(bookingEvent, _logger);
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


        private void ValidateUser(String userId)
        {
            if (!_monolit.IsUserActive(userId))
            {
                logger?.LogInformation($"User {userId} is inactive");
                throw new IllegalArgumentException("User is inactive");
            }
            if (_monolit.IsUserBlacklisted(userId))
            {
                logger.LogInformation($"User {userId} is blacklisted", userId);
                throw new IllegalArgumentException("User is blacklisted");
            }
            logger.LogInformation($"User {userId} is active", userId);

        }
        private void ValidateHotel(String hotelId)
        {
            if (!_monolit.IsHotelOperational(hotelId))
            {
                logger.LogInformation($"Hotel {hotelId} is not operational");
                throw new IllegalArgumentException("Hotel is not operational");
            }
            if (!_monolit.IsTrustedHotel(hotelId))
            {
                logger.LogInformation($"Hotel {hotelId} is not trusted");
                throw new IllegalArgumentException("Hotel is not trusted based on reviews");
            }
            if (_monolit.IsHotelFullyBooked(hotelId))
            {
                logger.LogInformation($"Hotel {hotelId} is fully booked");
                throw new IllegalArgumentException("Hotel is fully booked");
            }
        }

        private double ResolveBasePrice(string userId)
        {
            string statusOpt = _monolit.GetUserStatus(userId);
            if (statusOpt.Contains("VIP", StringComparison.OrdinalIgnoreCase))
                return 80.0;
            else
                return 100.0;
        }
        private double ResolvePromoDiscount(string? promoCode, string? userId)
        {
            if (promoCode=="" || promoCode == null)
                return 0.0;

            PromoCodeDTO promo = _monolit.ValidatePromoCode(promoCode, userId);
            if (promo == null)
            {
                logger.LogInformation(@"Promo code '{0}' is invalid or not applicable for user {1}", promoCode, userId);
                return 0.0;
            }

            logger.LogInformation(@"Promo code '{0}' applied with discount {1}", promoCode, promo.discount);
            return promo.discount;
        }

    }

    class IllegalArgumentException(string message) : Exception(message);
    record PromoCodeDTO(string code, double discount, bool active, bool vipOnly);
}

