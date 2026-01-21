using Google.Protobuf.WellKnownTypes;
using Grpc.Core;

namespace Hotelio.BookingService.Services;

public class BookingGrpcService : BookingService.BookingServiceBase
{
    private readonly ILogger<BookingGrpcService> _logger;
    private readonly IBookingService _bookingService;
    public BookingGrpcService(ILogger<BookingGrpcService> logger, IBookingService bookingService)
    {
        _bookingService = bookingService;
        _logger = logger;
    }

    public override async Task<BookingResponse> CreateBooking(BookingRequest request, ServerCallContext context)
    {
        _logger.LogInformation(
            "gRPC: CreateBooking called for user: {UserId}, hotel: {HotelId}, promo: {PromoCode}",
            request.UserId,
            request.HotelId,
            request.PromoCode ?? "null");

        var startTime = DateTime.UtcNow;

        try
        {
            // Извлекаем промокод (может быть null)
            string? promoCode = null;
            if (!string.IsNullOrWhiteSpace(request.PromoCode))
            {
                promoCode = request.PromoCode;
            }

            // 1. Валидация входных данных
            ValidateRequest(request);

            // 2. Создание бронирования через бизнес-сервис
            var booking = await _bookingService.CreateBooking(
                request.UserId,
                request.HotelId,
                promoCode);

            _logger.LogInformation(
                "gRPC: Booking created successfully. ID: {BookingId}, Price: {Price}, Discount: {Discount}%",
                booking.Id,
                booking.Price,
                booking.DiscountPercent);

            // 3. Преобразование в gRPC ответ
            var response = MapToGrpcResponse(booking);

            // Логирование времени выполнения
            var duration = DateTime.UtcNow - startTime;
            _logger.LogDebug("CreateBooking completed in {DurationMs}ms", duration.TotalMilliseconds);

            return response;
        }
        catch (ArgumentException ex) when (
            ex.Message.Contains("inactive", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("blacklisted", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("not operational", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("fully booked", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("not trusted", StringComparison.OrdinalIgnoreCase))
        {
            // Бизнес-ошибки валидации
            _logger.LogWarning("gRPC: Validation failed: {ErrorMessage}", ex.Message);
            throw new RpcException(
                new Status(StatusCode.InvalidArgument, ex.Message),
                CreateErrorMetadata(ex));
        }
        catch (RpcException)
        {
            // Пробрасываем gRPC ошибки как есть
            throw;
        }
        catch (Exception ex)
        {
            // Неожиданные ошибки
            _logger.LogError(ex, "gRPC: Unexpected error in CreateBooking");
            throw new RpcException(
                new Status(StatusCode.Internal, "Internal server error"),
                CreateErrorMetadata(ex));
        }
    }

    public override async Task<BookingListResponse> ListBookings(BookingListRequest request, ServerCallContext context)
    {
        _logger.LogInformation(
            "gRPC: ListBookings called for user: {UserId}",
            request.UserId);

        try
        {
            // Получение бронирований через бизнес-сервис
            var bookings = string.IsNullOrWhiteSpace(request.UserId)
                ? await _bookingService.GetAllBookings()
                : await _bookingService.GetBookingsByUserId(request.UserId);

            _logger.LogInformation(
                "gRPC: Found {Count} bookings for user {UserId}",
                bookings.Count(),
                request.UserId);

            // Преобразование в gRPC ответ
            var response = new BookingListResponse();
            response.Bookings.AddRange(bookings.Select(MapToGrpcResponse));

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "gRPC: Error in ListBookings for user {UserId}", request.UserId);
            throw new RpcException(
                new Status(StatusCode.Internal, "Failed to retrieve bookings"),
                CreateErrorMetadata(ex));
        }
    }

    /// <summary>
    /// Валидация входных данных запроса
    /// </summary>
    private void ValidateRequest(BookingRequest request)
    {
        var validationErrors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.UserId))
        {
            validationErrors.Add("UserId is required");
        }

        if (string.IsNullOrWhiteSpace(request.HotelId))
        {
            validationErrors.Add("HotelId is required");
        }

        if (request.UserId?.Length > 50)
        {
            validationErrors.Add("UserId max length is 50 characters");
        }

        if (request.HotelId?.Length > 50)
        {
            validationErrors.Add("HotelId max length is 50 characters");
        }

        if (!string.IsNullOrEmpty(request.PromoCode) && request.PromoCode.Length > 20)
        {
            validationErrors.Add("PromoCode max length is 20 characters");
        }

        if (validationErrors.Any())
        {
            throw new RpcException(
                new Status(StatusCode.InvalidArgument, string.Join("; ", validationErrors)));
        }
    }

    /// <summary>
    /// Преобразование доменной модели Booking в gRPC ответ
    /// </summary>
    private BookingResponse MapToGrpcResponse(Entities.Booking booking)
    {
        var response = new BookingResponse
        {
            Id = booking.Id.ToString() ?? "",  // Всегда не null!
            UserId = booking.UserId ?? "",
            HotelId = booking.HotelId ?? "",
            PromoCode = booking.PromoCode ?? "",  // null -> ""
            DiscountPercent = booking.DiscountPercent,
            Price = booking.Price,
            CreatedAt = booking.CreatedAt.ToString("o")
        };

        return response;
    }

    /// <summary>
    /// Создание метаданных для ошибок gRPC
    /// </summary>
    private Metadata CreateErrorMetadata(Exception ex)
    {
        var metadata = new Metadata();

        // Добавляем информацию об ошибке в метаданные
        metadata.Add("error-type", ex.GetType().Name);

        if (_logger.IsEnabled(LogLevel.Debug))
        {
            metadata.Add("error-stack", ex.StackTrace ?? string.Empty);
        }

        // Добавляем timestamp
        metadata.Add("timestamp", DateTime.UtcNow.ToString("O"));

        return metadata;
    }
}
