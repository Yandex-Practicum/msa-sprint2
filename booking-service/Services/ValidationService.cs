
using Hotelio.BookingService.Clients;
using Hotelio.BookingService.MonolithClients;

namespace Hotelio.BookingService.Services
{
    public interface IValidationService
    {
        Task ValidateUser(string userId);
        Task ValidateHotel(string hotelId);
    }

    public class ValidationService : IValidationService
    {
        private readonly IUserClient _userClient;
        private readonly IHotelClient _hotelClient;
        private readonly IReviewClient _reviewClient;
        private readonly ILogger<ValidationService> _logger;

        public ValidationService(
            IUserClient userClient,
            IHotelClient hotelClient,
            IReviewClient reviewClient,
            ILogger<ValidationService> logger)
        {
            _userClient = userClient;
            _hotelClient = hotelClient;
            _reviewClient = reviewClient;
            _logger = logger;
        }

        public async Task ValidateHotel(string hotelId)
        {
            if (!await _hotelClient.IsHotelOperational(hotelId))
            {
                _logger.LogWarning("Hotel {} is not operational", hotelId);
                throw new ArgumentException("Hotel is not operational");
            }
            if (!await _reviewClient.IsHotelTrusted(hotelId))
            {
                _logger.LogWarning("Hotel {} is not trusted", hotelId);
                throw new ArgumentException("Hotel is not trusted based on reviews");
            }
            if (await _hotelClient.IsHotelFullyBooked(hotelId))
            {
                _logger.LogWarning("Hotel {} is fully booked", hotelId);
                throw new ArgumentException("Hotel is fully booked");
            }
        }

        public async Task ValidateUser(string userId)
        {
            if (!await _userClient.IsUserActive(userId))
            {
                _logger.LogWarning("User {} is inactive", userId);
                throw new ArgumentException("User is inactive");
            }
            if (await _userClient.IsUserBlacklisted(userId))
            {
                _logger.LogWarning("User {} is blacklisted", userId);
                throw new ArgumentException("User is blacklisted");
            }
        }
    }
}
