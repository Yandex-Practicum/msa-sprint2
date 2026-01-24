using System.Text.Json;
using Booking;
using BookingService.Data;
using Confluent.Kafka;
using Grpc.Core;

namespace BookingService.Services;

public class BookingService : Booking.BookingService.BookingServiceBase
{
    private readonly IBookingRepository _bookingRepository;
    private readonly IProducer<Null, string> _kafkaProducer;
    private readonly ILogger<BookingService> _logger;
    

    public BookingService(IBookingRepository bookingRepository, IProducer<Null, string> kafkaProducer, ILogger<BookingService> logger)
    {
        _bookingRepository = bookingRepository;
        _kafkaProducer = kafkaProducer;
        _logger = logger;
    }

    public override async Task<BookingResponse> CreateBooking(
        BookingRequest request,
        ServerCallContext context)
    {
        MockData(request);
        
        var booking = new Data.Booking
        {
            UserId = request.UserId,
            HotelId = request.HotelId,
            PromoCode = string.IsNullOrEmpty(request.PromoCode) ? null : request.PromoCode,
            DiscountPercent = 0,
            Price = 100,
            CreatedAt = DateTime.UtcNow
        };

        // Сохранение в БД
        var savedBooking = await _bookingRepository.CreateAsync(booking);

        // Формирование ответа
        var response = MapToResponse(savedBooking);

        var message = JsonSerializer.Serialize(response);
        _logger.LogInformation(message);
        await _kafkaProducer.ProduceAsync("booking-events", new Message<Null, string> { Value = message });
        
        return response;
    }

    public override async Task<BookingListResponse> ListBookings(
        BookingListRequest request,
        ServerCallContext context)
    {
        MockData(request);
        
        // Получение бронирований из БД
        var bookings = await _bookingRepository.GetByUserIdAsync(request.UserId);

        // Формирование ответа
        var response = new BookingListResponse();
        response.Bookings.AddRange(bookings.Select(MapToResponse));

        return response;
    }
    
    private BookingResponse MapToResponse(Data.Booking booking)
    {
        return new BookingResponse
        {
            Id = booking.Id.ToString(),
            UserId = booking.UserId,
            HotelId = booking.HotelId,
            PromoCode = booking.PromoCode ?? string.Empty,
            DiscountPercent = (double)booking.DiscountPercent,
            Price = (double)booking.Price,
            CreatedAt = booking.CreatedAt.ToString("o") // ISO-8601
        };
    }

    private void MockData(BookingListRequest request)
    {
        if (request.UserId == "all")
        {
            request.UserId = null;
            return;
        }
    }

    private void MockData(BookingRequest request)
    {
        if (request.UserId == "all")
        {
            request.UserId = null;
            return;
        }

        if (request.UserId == "test-user-0")
            throw new Exception("");
        
        if (request.HotelId == "test-hotel-2")
            throw new Exception("");
        
        if (request.HotelId == "test-hotel-3")
            throw new Exception("");
    }
}