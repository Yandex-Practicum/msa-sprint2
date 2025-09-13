using Grpc.Core;
using HotelioBookingService.Clients;
using HotelioBookingService.Entities;
using HotelioBookingService.Repositories;

namespace HotelioBookingService.Services;

public class BookingServiceApi : BookingService.BookingServiceBase
{
    private readonly IBookingRepository _repository;
    private readonly IMonolithClient _monolithClient;
    private readonly IKafkaProducerService<Booking> _kafkaProducer;
    private readonly ILogger _logger;


    /// <inheritdoc />
    public BookingServiceApi(IBookingRepository repository,
        IMonolithClient monolithClient,
        IKafkaProducerService<Booking> kafkaProducer,
        ILogger<BookingServiceApi> logger)
    {
        _repository = repository;
        _monolithClient = monolithClient;
        _kafkaProducer = kafkaProducer;
        _logger = logger;
    }

    //public event EventHandler<Booking> BookingCreated;

    public override async Task<BookingResponse> CreateBooking(BookingRequest request, ServerCallContext context)
    {
        _logger.LogInformation(
            "CreateBooking: userId={RequestUserId}, hotelId={RequestHotelId}, promoCode={RequestPromoCode}",
            request.UserId, request.HotelId, request.PromoCode);

        await ValidateUser(request.UserId).ConfigureAwait(false);
        await ValidateHotel(request.HotelId).ConfigureAwait(false);
        _logger.LogInformation("User and hotel validated.");

        double basePrice = await ResolveBasePrice(request.UserId).ConfigureAwait(false);
        double discount = await ResolvePromoDiscount(request.PromoCode, request.UserId).ConfigureAwait(false);
        double finalPrice = basePrice - discount;

        _logger.LogInformation("Final price calculated: base={BasePrice}, discount={Discount}, final={FinalPrice}",
            basePrice, discount, finalPrice);

        var data = new Booking()
        {
            UserId = request.UserId,
            HotelId = request.HotelId,
            PromoCode = request.PromoCode,
            Price = finalPrice,
            DiscountPrecent = discount
        };
        var entity = await _repository.CreateAsync(data).ConfigureAwait(false);
        var result = ConvertFrom(entity);
        await _kafkaProducer.SendMessageAsync("bookings", entity).ConfigureAwait(false);
        return result;
    }

    public override async Task<BookingListResponse> ListBookings(BookingListRequest request, ServerCallContext context)
    {
        var response = new BookingListResponse();
        var queryResult = await _repository.GetAllUserBookingsAsync(request.UserId).ConfigureAwait(false);

        foreach (var entity in queryResult)
        {
            response.Bookings.Add(ConvertFrom(entity));
        }

        return response;
    }

    private async ValueTask<double> ResolveBasePrice(string userId)
    {
        string userStatus = await _monolithClient.GetUserStatus(userId).ConfigureAwait(false);

        bool isVip = !string.IsNullOrWhiteSpace(userStatus) &&
                     userStatus.Equals("VIP", StringComparison.OrdinalIgnoreCase);

        double resultPrice = !isVip ? 80.0 : 100.0;

        if (!string.IsNullOrWhiteSpace(userStatus))
            _logger.LogDebug("User {userId} has status '{userStatus}', base price is {price}", userId, userStatus,
                resultPrice);
        else
        {
            _logger.LogDebug("User {userId} has unknown status, default base price 100.0", userId);
        }

        return resultPrice;
    }

    private async ValueTask<double> ResolvePromoDiscount(string promoCode, string userId)
    {
        if (string.IsNullOrWhiteSpace(promoCode))
            return 0.0;

        var promo = await _monolithClient.ValidatePromo(promoCode, userId);

        if (promo == null)
        {
            _logger.LogInformation("Promo code '{promoCode}' is invalid or not applicable for user {userId}",
                promoCode, userId);
            return 0.0;
        }

        _logger.LogDebug("Promo code '{promoCode}' applied with discount {discount}", promoCode, promo.Discount);
        return promo.Discount;
    }

    private async Task ValidateUser(string userId)
    {
        if (!await _monolithClient.IsUserActive(userId).ConfigureAwait(false))
        {
            _logger.LogWarning("User {userId} is inactive", userId);
            throw new ArgumentException("User is inactive");
        }

        _logger.LogInformation("User {userId} is active", userId);

        if (await _monolithClient.IsUserBlacklisted(userId).ConfigureAwait(false))
        {
            _logger.LogWarning("User {userId} is blacklisted", userId);
            throw new ArgumentException("User is blacklisted");
        }

        _logger.LogInformation("User {userId} is NOT blacklisted", userId);
    }

    private async Task ValidateHotel(string hotelId)
    {
        if (!await _monolithClient.IsHotelOperational(hotelId).ConfigureAwait(false))
        {
            _logger.LogWarning("Hotel {hotelId} is NOT operational", hotelId);
            throw new ArgumentException("Hotel is not operational");
        }

        _logger.LogInformation("Hotel {hotelId} is operational", hotelId);

        if (!await _monolithClient.IsHotelTrusted(hotelId).ConfigureAwait(false))
        {
            _logger.LogWarning("Hotel {hotelId} is not trusted", hotelId);
            throw new ArgumentException("Hotel is not trusted based on reviews");
        }

        _logger.LogInformation("Hotel {hotelId} is trusted", hotelId);

        if (await _monolithClient.IsFullyBooked(hotelId).ConfigureAwait(false))
        {
            _logger.LogWarning("Hotel {hotelId} is fully booked", hotelId);
            throw new ArgumentException("Hotel is fully booked");
        }

        _logger.LogInformation("Hotel {hotelId} is NOT fully booked", hotelId);
    }

    private static BookingResponse ConvertFrom(Booking entity)
    {
        var result = new BookingResponse()
        {
            HotelId = entity.HotelId,
            Price = entity.Price,
            PromoCode = entity.PromoCode,
            UserId = entity.UserId,
            CreatedAt = entity.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            DiscountPercent = entity.DiscountPrecent ?? 0,
            Id = entity.Id.ToString(),
        };
        return result;
    }
}