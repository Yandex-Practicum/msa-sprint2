using Hotelio.BookingService.Entities;
using Hotelio.BookingService.MonolithClients;
using Hotelio.BookingService.Repositories;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace Hotelio.BookingService.Services
{
    public interface IBookingService
    {
        Task<Booking> CreateBooking(string userId, string hotelId, string? promoCode);
        Task<IEnumerable<Booking>> GetAllBookings();
        Task<IEnumerable<Booking>> GetBookingsByUserId(string userId);
    }

    public class BookingServiceImpl : IBookingService
    {
        private readonly IBookingRepository _bookingRepository;
        private readonly IValidationService _validationService;
        private readonly IPriceCalculationService _priceCalculationService;
        private readonly IUserClient _userClient;
        private readonly IHotelClient _hotelClient;
        private readonly IKafkaProducer _producer;
        private readonly ILogger<BookingServiceImpl> _logger;
        public BookingServiceImpl(IBookingRepository bookingRepository, IValidationService validationService, IPriceCalculationService priceCalculationService, ILogger<BookingServiceImpl> logger, IUserClient userClient, IHotelClient hotelClient, IKafkaProducer producer)
        {
            _bookingRepository = bookingRepository;
            _validationService = validationService;
            _priceCalculationService = priceCalculationService;
            _logger = logger;
            _userClient = userClient;
            _hotelClient = hotelClient;
            _producer = producer;
        }

        public async Task<Booking> CreateBooking(string userId, string hotelId, string? promoCode)
        {
            _logger.LogInformation("Creating booking: userId={}, hotelId={}, promoCode={}", userId, hotelId, promoCode);

            await _validationService.ValidateUser(userId);
            await _validationService.ValidateHotel(hotelId);

            var priceDetails = await _priceCalculationService.CalculatePrice(userId, hotelId, promoCode);
            if (priceDetails == null)
                throw new Exception("Error on calculating price");

            var basePrice = priceDetails.BasePrice;
            var discount = priceDetails.DiscountPercent;
            var finalPrice = priceDetails.FinalPrice;

            _logger.LogInformation("Final price calculated: base={}, discount={}, final={}", basePrice, discount, finalPrice);

            Booking booking = new Booking() { UserId = userId, HotelId = hotelId };
            booking.PromoCode = promoCode;
            booking.DiscountPercent = discount;
            booking.Price = finalPrice;

            await _bookingRepository.Create(booking);

            _logger.LogInformation(
            "✅ Booking created successfully: ID={BookingId}, Price={FinalPrice}",
            booking.Id, booking.Price);

            try
            {
                // ОТПРАВКА СОБЫТИЯ В KAFKA (BookingCreatedEvent)
                await SendBookingCreatedEventAsync(booking);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send booking event to Kafka");
                // Не прерываем основной поток, только логируем ошибку
            }

            return booking;
        }

        public async Task<IEnumerable<Booking>> GetAllBookings()
        {
            return await _bookingRepository.GetAll();
        }

        public async Task<IEnumerable<Booking>> GetBookingsByUserId(string userId)
        {
            return await _bookingRepository.GetByUserId(userId);
        }

        /// <summary>
        /// Отправка события в Kafka
        /// </summary>
        private async Task SendBookingCreatedEventAsync(Booking booking)
        {
            try
            {
                // Получаем дополнительные данные для аналитики
                var hotelCity = await _hotelClient.GetHotelCity(booking.HotelId);
                var userStatus = await _userClient.GetUserStatus(booking.UserId);

                var bookingEvent = new BookingCreatedEvent
                {
                    BookingId = booking.Id.ToString(),
                    UserId = booking.UserId,
                    HotelId = booking.HotelId,
                    Price = (double)booking.Price,
                    DiscountPercent = (double)booking.DiscountPercent,
                    CreatedAt = booking.CreatedAt.ToString("o"),
                    HotelCity = hotelCity ?? "unknown",
                    UserStatus = userStatus ?? "unknown"
                };

                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };

                var message = JsonSerializer.Serialize(bookingEvent, jsonOptions);

                // Логируем ответ для отладки
                _logger.LogInformation("Sending gRPC response: {Response}",
                    message);

                await _producer.ProduceAsync("booking-created", message);

                _logger.LogInformation(
                    "📤 Sent booking created event to Kafka: {BookingId}",
                    booking.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create/send booking event to Kafka");
                throw;
            }
        }
    }
}
