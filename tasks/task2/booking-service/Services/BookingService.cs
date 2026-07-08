using Booking;
using BookingService.Data;
using Confluent.Kafka;
using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BookingService.Services;

public class BookingServiceImpl : Booking.BookingService.BookingServiceBase
{
    private readonly BookingDbContext _dbContext;
    private readonly ILogger<BookingServiceImpl> _logger;
    private readonly IProducer<string, string> _kafkaProducer;
    public BookingServiceImpl(BookingDbContext dbContext,
        ILogger<BookingServiceImpl> logger,
        IProducer<string, string> kafkaProducer)
    {
        _dbContext = dbContext;
        _logger = logger;
        _kafkaProducer = kafkaProducer;
    }

    public override async Task<BookingResponse> CreateBooking(BookingRequest request, ServerCallContext context)
    {
        _logger.LogInformation("Creating booking for user: {UserId}, hotel: {HotelId}", request.UserId, request.HotelId);

        try
        {
            var model = new Models.Booking()
            {
                UserId = request.UserId,
                HotelId = request.HotelId,
                PromoCode = request.PromoCode,
                DiscountPercent = 0,
                Price = 100.0
            };

            await _dbContext.Bookings.AddAsync(model);
            await _dbContext.SaveChangesAsync();

            // Отправка события в Kafka
            try
            {
                var bookingEvent = new
                {
                    id = model.Id.ToString(),
                    userId = model.UserId,
                    hotelId = model.HotelId,
                    price = model.Price,
                    createdAt = model.CreatedAt.ToString("O")
                };

                var jsonMessage = JsonSerializer.Serialize(bookingEvent);

                await _kafkaProducer.ProduceAsync("bookings", new Message<string, string>
                {
                    Key = model.UserId,
                    Value = jsonMessage
                });

                _logger.LogInformation("Event published to Kafka for booking {Id}", model.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish booking event to Kafka");
                // Не пробрасываем ошибку дальше, чтобы сбой Kafka не отменял успешное бронирование
            }

            return new BookingResponse
            {
                Id = model.Id.ToString(),
                UserId = model.UserId,
                HotelId = model.HotelId,
                PromoCode = model.PromoCode ?? "",
                DiscountPercent = model.DiscountPercent,
                Price = model.Price,
                CreatedAt = model.CreatedAt.ToString("o")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating booking");
            throw new RpcException(new Status(StatusCode.Internal, ex.Message));
        }
    }

    public override async Task<BookingListResponse> ListBookings(BookingListRequest request, ServerCallContext context)
    {
        _logger.LogInformation("Listing bookings for user: {UserId}", request.UserId);

        try
        {
            var query = _dbContext.Bookings.AsQueryable();
            if (!string.IsNullOrEmpty(request.UserId))
            {
                query = query.Where(b => b.UserId == request.UserId);
            }

            var bookings = await query.ToListAsync();

            var response = new BookingListResponse();
            foreach (var booking in bookings)
            {
                response.Bookings.Add(new BookingResponse
                {
                    Id = booking.Id.ToString(),
                    UserId = booking.UserId,
                    HotelId = booking.HotelId,
                    PromoCode = booking.PromoCode ?? "",
                    DiscountPercent = booking.DiscountPercent,
                    Price = booking.Price,
                    CreatedAt = booking.CreatedAt.ToString("O")
                });
            }

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing bookings");
            throw new RpcException(new Status(StatusCode.Internal, ex.Message));
        }
    }
}
